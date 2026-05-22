# Contributing

## Development setup

```bash
bun install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
bun run db:push
bun run dev
```

The web app runs on `http://localhost:3001` and the server runs on
`http://localhost:3000`.

## Before opening a PR

- Run `bun run check-types`
- Run `bun run build` if your change affects production code or config
- Keep secrets out of commits and use the example env files for documentation

## Scope

Please keep pull requests focused. Small, reviewable changes are much easier to
merge safely than broad refactors mixed with feature work.
