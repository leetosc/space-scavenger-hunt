# Deployment Guide

This app runs as two long-running processes on a VPS:

- **apps/server** (Bun + Express + tRPC + Better Auth) on `localhost:3000`
- **apps/web** (`next start`) on `localhost:3001`

A reverse proxy (Caddy or Nginx) terminates TLS and routes traffic to the
correct process.

## 1. Host prerequisites

Install once on the VPS:

```bash
# Bun runtime (one of these depending on distro):
curl -fsSL https://bun.sh/install | bash

# PM2 (process manager) — uses npm, but PM2 itself can run Bun commands:
sudo apt-get install -y nodejs npm
sudo npm install -g pm2

# A reverse proxy. Caddy is easiest (auto TLS):
sudo apt-get install -y caddy
# (or install Nginx + certbot)
```

## 2. Filesystem layout

```text
/var/www/scavenger-hunt/app          # checkout of this repo
/var/www/scavenger-hunt/data/        # persistent storage
/var/www/scavenger-hunt/data/prod.db # SQLite database file
/var/www/scavenger-hunt/backups/     # rotated backups
```

```bash
sudo mkdir -p /var/www/scavenger-hunt/{data,backups}
sudo chown -R $USER:$USER /var/www/scavenger-hunt
```

## 3. Clone, install, push schema, build

```bash
cd /var/www/scavenger-hunt
git clone <your-repo-url> app
cd app
bun install
```

Create `apps/server/.env` from `apps/server/.env.example`:

```env
DATABASE_URL=file:/var/www/scavenger-hunt/data/prod.db

BETTER_AUTH_SECRET=<openssl rand -base64 48>
BETTER_AUTH_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

NODE_ENV=production

ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-random-password>
USER_EMAIL_DOMAIN=scavengerhunt.local

APP_BASE_URL=https://your-domain.com

AZURE_AI_FOUNDRY_ENDPOINT=https://<resource>.cognitiveservices.azure.com/openai/v1/
AZURE_AI_FOUNDRY_API_KEY=<your-foundry-key>
AZURE_AI_FOUNDRY_MODEL=gpt-5.4

AZURE_STORAGE_CONNECTION_STRING=<azure-storage-connection-string>
AZURE_STORAGE_CONTAINER_NAME=scavenger-hunt-uploads

MAX_UPLOAD_MB=8
CLAIM_ATTEMPT_EXPIRATION_MINUTES=15
```

Create `apps/web/.env` (Next.js):

```env
NEXT_PUBLIC_SERVER_URL=https://your-domain.com
NEXT_PUBLIC_IMAGE_REMOTE_HOSTS=myaccount.blob.core.windows.net
```

Push schema and build:

```bash
bun run db:deploy      # applies migrations (creates SQLite tables on first run)
bun run build          # builds both apps via turbo
```

If you previously created `prod.db` with `db:push`, baseline it once so
`db:deploy` does not try to recreate existing tables:

```bash
cd packages/db
bunx prisma migrate resolve --applied 0_init
```

## 4. Run the processes

Use PM2 (one process per app):

```bash
# Start server (Bun runs the entry directly):
pm2 start --name scavenger-server --interpreter bun apps/server/src/index.ts

# Start web (uses next start on port 3001):
pm2 start --name scavenger-web --cwd apps/web --interpreter bun -- bun run start

pm2 save
pm2 startup            # follow the printed instructions to enable on boot
```

On first start, `apps/server` will auto-create the admin user from
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. Sign in at `https://your-domain.com/login`
with that username and password, then immediately rotate the password from
your admin profile (future enhancement).

If you would rather use systemd, see the [systemd unit templates](#systemd-templates)
at the bottom of this file.

## 5. Reverse proxy

### Caddy (recommended)

`/etc/caddy/Caddyfile`:

```caddy
your-domain.com {
    encode zstd gzip

    # API + auth + tRPC + uploads -> apps/server (:3000)
    @api path /api/* /trpc /trpc/*
    handle @api {
        request_body {
            max_size 10MB
        }
        reverse_proxy 127.0.0.1:3000
    }

    # Everything else -> apps/web (:3001)
    handle {
        reverse_proxy 127.0.0.1:3001
    }
}
```

Reload: `sudo systemctl reload caddy`.

### Nginx alternative

`/etc/nginx/sites-available/scavenger-hunt`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # certbot will fill these:
    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /trpc {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`sudo nginx -t && sudo systemctl reload nginx`.

`client_max_body_size` should be at least `MAX_UPLOAD_MB + 2` MB.

## 6. SQLite backups

Use SQLite's built-in `.backup` command (works while the DB is in use, even
under WAL):

```bash
cat <<'SH' | sudo tee /etc/cron.daily/scavenger-hunt-backup
#!/bin/bash
set -euo pipefail
ts=$(date +%Y%m%d-%H%M%S)
sqlite3 /var/www/scavenger-hunt/data/prod.db \
  ".backup '/var/www/scavenger-hunt/backups/prod-${ts}.db'"
# Keep the last 14 backups:
ls -1t /var/www/scavenger-hunt/backups/prod-*.db | tail -n +15 | xargs -r rm --
SH
sudo chmod +x /etc/cron.daily/scavenger-hunt-backup
```

Also run a snapshot manually right before and right after the event.

## 7. Updating to a new version

```bash
cd /var/www/scavenger-hunt/app
git pull
bun install
bun run db:deploy      # only if schema changed
bun run build
pm2 restart scavenger-server scavenger-web
```

## 8. systemd templates

If you prefer systemd over PM2, drop these into `/etc/systemd/system/`.

`/etc/systemd/system/scavenger-server.service`:

```ini
[Unit]
Description=Scavenger Hunt API server
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/var/www/scavenger-hunt/app
ExecStart=/home/app/.bun/bin/bun run apps/server/src/index.ts
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/scavenger-web.service`:

```ini
[Unit]
Description=Scavenger Hunt web (Next.js)
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/var/www/scavenger-hunt/app/apps/web
ExecStart=/home/app/.bun/bin/bun run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now scavenger-server scavenger-web
sudo journalctl -u scavenger-server -f
```

## 9. Smoke check after deploy

```bash
curl -fsS https://your-domain.com/api/trpc/healthCheck
# Expect: {"result":{"data":"OK"}}
```

Sign in at `/login`, visit `/admin`, run through:

1. Create 4 teams
2. Create players (admin pre-creates Better Auth users)
3. Create astronauts (copy scan URLs)
4. Assign astronauts to teams
5. Open `/admin/kickoff`, plus `/kickoff` on a separate window/big-screen
6. Spin players, begin activity
7. Hit a scan URL on a phone, upload a photo, watch the leaderboard
