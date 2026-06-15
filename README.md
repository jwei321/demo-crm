# Relay — Relationships in motion

**Relay** is a modern, fast, and beautiful CRM for sales teams. Track your
contacts, accounts, and deal pipeline in one focused workspace — with a drag-and-drop
Kanban board, live analytics, and a clean indigo-violet design system.

Built with **Next.js 14**, **Prisma**, **PostgreSQL**, **Tailwind CSS**, and **Recharts**,
it ships with seeded demo data and deploys to the cloud (Railway) in a few clicks.

> This repo is a fully working **live demo** — every page is connected to a real
> cloud database. See [BRAND.md](./BRAND.md) for the design system and
> [ROADMAP.md](./ROADMAP.md) for what to build next.

## Features

- **Dashboard** — a gradient "what's moving today" hero, KPI cards with trend chips, an open-pipeline-by-stage strip, and recent contacts/deals.
- **Pipeline (Kanban)** — drag deals between stages, board ⇄ list views, inline create/edit/delete, and automatic close-date handling when a deal is won or lost. *(New in v2.)*
- **Contacts** — full CRUD with avatars, search, status filter, and company linking.
- **Companies** — full CRUD with industry filter, revenue/headcount rollups, and deal/contact counts.
- **Analytics** — pipeline-by-stage, contact-status mix, monthly growth, revenue-by-industry, and a top-accounts table.
- **Dark mode** — system-aware with a manual toggle.
- **Cloud persistence** — PostgreSQL via Prisma, with seeded mock data (12 companies, 60 contacts, 80 deals).

## Tech Stack

| Layer       | Choice                                  |
| ----------- | --------------------------------------- |
| Framework   | Next.js 14 (App Router, Server Comp.)   |
| Database    | PostgreSQL                              |
| ORM         | Prisma 5                                |
| Styling     | Tailwind CSS + custom design tokens     |
| Charts      | Recharts                                |
| Hosting     | Railway (auto-detected via Nixpacks)    |

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your database

```bash
cp .env.example .env
```

The fastest local Postgres is Docker:

```bash
docker run --name relay-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

Then in `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

### 3. Push schema and seed mock data

```bash
npm run db:push
npm run db:seed
```

### 4. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## The Cloud System (data storage)

Relay stores all data in a **managed PostgreSQL database in the cloud**. The
architecture is deliberately simple and inexpensive:

```
Code (GitHub)  ──push──▶  Railway  ──▶  Next.js web app  ──▶  PostgreSQL
```

- **Railway** hosts both the web app and the Postgres database, injecting
  `DATABASE_URL` into the app automatically.
- Every push to `main` triggers an automatic redeploy.
- `railway.json` runs `prisma db push` on each start, so schema changes go
  live with the deploy.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full diagram and the exact
setup steps, including how to seed the cloud database after the first deploy.

### Deploying to Railway (short version)

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo**.
3. **+ New → Database → Add PostgreSQL** (Railway injects `DATABASE_URL`).
4. After the first deploy, seed the cloud DB once:
   ```bash
   npm i -g @railway/cli && railway login && railway link
   railway run npm run db:seed
   ```
5. **Settings → Networking → Generate Domain** to get a public URL.

## Project Structure

```
prisma/
  schema.prisma          # Company, Contact, Deal models
  seed.ts                # Mock data generator
src/
  app/
    page.tsx             # Dashboard (hero + KPIs + pipeline strip)
    deals/               # Pipeline Kanban + list + CRUD modal
    contacts/            # Contacts page + CRUD modal
    companies/           # Companies page + CRUD modal
    analytics/           # Charts + KPIs
    api/
      deals/             # GET, POST, PATCH, DELETE
      contacts/          # GET, POST, PATCH, DELETE
      companies/         # GET, POST, PATCH, DELETE
  components/            # Sidebar, TopBar, Logo, Modal, StatCard, Icon, PageHeader
  lib/
    prisma.ts            # Singleton Prisma client
    format.ts            # Currency / date / avatar / stage helpers
railway.json             # Railway deploy config
```

## Useful Commands

| Command              | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Start Next.js in dev mode                      |
| `npm run build`      | Generate Prisma client + build for production  |
| `npm run start`      | Start the production server                    |
| `npm run db:push`    | Sync `schema.prisma` to the database           |
| `npm run db:seed`    | Insert mock companies, contacts, and deals     |
| `npm run db:reset`   | Wipe and re-create the database (dev only)     |

## Notes

- This is a demo without authentication. Before exposing to real users, gate the
  routes (e.g. with [NextAuth](https://next-auth.js.org/)) — see the
  Authentication item in [ROADMAP.md](./ROADMAP.md).
- The seed script is idempotent — running it wipes all data first, then inserts a
  fresh dataset. Seeding is intentionally CLI-only (no public endpoint).
- Prisma `Decimal` fields are serialized to plain numbers at the page boundary,
  so they don't leak into client components.
