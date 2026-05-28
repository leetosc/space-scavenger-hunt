# Astronaut NFC Scavenger Hunt

Team-based office scavenger hunt where players find hidden astronauts by scanning NFC tags. The app generates AI photo challenges, judges submissions with vision AI, and ranks teams on a live leaderboard.

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack): Next.js + Express + tRPC + Better Auth + Prisma (SQLite/libsql) + Bun + Turborepo.

## Quick start

```bash
bun install
cp apps/server/.env.example apps/server/.env   # fill in admin + Azure secrets
cp apps/web/.env.example apps/web/.env
bun run db:push                                # create SQLite tables
bun run dev                                    # starts server (:3000) + web (:3001)
```

On first server boot, an admin user is auto-created from `ADMIN_USERNAME` /
`ADMIN_PASSWORD`. Sign in at <http://localhost:3001/login> with those
credentials, then create teams, players, astronauts, and run the kickoff.

For production deployment, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Required services

The app depends on a few external services:

- Azure AI Foundry/OpenAI-compatible deployment for challenge generation and
  image judging
- Azure Blob Storage for submitted photos
- SQLite or libsql/Turso for persistence

If you want a completely self-contained local fork, you will need to replace
the Azure-backed AI and storage services with local or alternative providers.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Express** - Fast, unopinionated web framework
- **tRPC** - End-to-end type-safe APIs
- **Bun** - Runtime environment
- **Prisma** - TypeScript-first ORM
- **SQLite/Turso** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses SQLite with Prisma.

1. Start the local SQLite database (optional):

```bash
bun run db:local
```

2. Update your `.env` file in the `apps/server` directory with the appropriate connection details if needed.
3. Copy `apps/web/.env.example` to `apps/web/.env` and point
   `NEXT_PUBLIC_SERVER_URL` at the API server.

4. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@space-scavenger-hunt/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Project Structure

```
space-scavenger-hunt/
├── apps/
│   ├── web/         # Frontend application (Next.js)
│   └── server/      # Backend API (Express, TRPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run test:e2e`: Run Playwright end-to-end tests
- `bun run test:e2e:ui`: Run Playwright end-to-end tests in the UI runner
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database (local dev only)
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Create and apply migrations in development
- `bun run db:deploy`: Apply pending migrations (production)
- `bun run db:studio`: Open database studio UI
- `bun run db:local`: Start the local SQLite database

## End-to-end tests

Playwright tests live in `e2e/`.

```bash
bun run test:e2e
```

The E2E runner checks `http://localhost:3000` and `http://localhost:3001`
before starting anything. If both the API and web app are already healthy, the
tests reuse them. If neither is running, the runner starts an isolated test
stack with a throwaway database under `.e2e/`. If only one service is running
or one port is occupied by an unhealthy process, the runner fails with a message
showing which service needs attention.
