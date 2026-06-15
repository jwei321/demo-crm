# Relay CRM — Run it on your own computer

This is the full, real CRM web app (Next.js + PostgreSQL). No GitHub needed.
Everything runs locally; you open it in your browser at **http://localhost:3000**.

---

## Easiest way — Docker (one command)

You only need **Docker Desktop** installed: https://www.docker.com/products/docker-desktop/

1. Unzip this folder.
2. Open a terminal **inside the unzipped folder**.
3. Run:

   ```bash
   docker compose up --build
   ```

4. Wait until you see:

   ```
   Relay CRM is starting at http://localhost:3000
   ```

5. Open **http://localhost:3000** in your browser.

**Log in with the demo account:**

- Email: `demo@relay.app`
- Password: `relay1234`

That's it. The database, demo data (12 companies, 60 contacts, 80 deals),
and the web app all start automatically.

To stop it: press `Ctrl+C` in the terminal, then run `docker compose down`.
To wipe the data and start fresh: `docker compose down -v`.

---

## What you get

- Dashboard with live pipeline KPIs
- Pipeline (drag-and-drop Kanban) + deal detail pages
- Contacts & Companies with CSV import/export
- Tasks with due dates and reminders
- Activities & notes timeline on every deal
- ⌘K global command palette (press Cmd/Ctrl + K)
- Team workspace with teammate invites
- Login / signup / password reset
- AI deal assistant (add an Anthropic API key to enable — see below)

---

## Optional: enable email + AI

Open `docker-compose.yml`, find the `app:` → `environment:` section, and fill in:

```yaml
RESEND_API_KEY: "your-resend-key"      # turns on real password-reset emails
ANTHROPIC_API_KEY: "your-anthropic-key" # turns on the AI deal assistant
```

Then run `docker compose up --build` again. Without these keys the app still
works fully — password-reset links print to the terminal, and the AI assistant
falls back to a built-in rule-based suggestion.

---

## No Docker? Run it directly

You need **Node.js 20+** and a **PostgreSQL** database running locally.

```bash
# 1. install dependencies
npm install

# 2. create a .env file (edit the DATABASE_URL to match your Postgres)
cp .env.example .env

# 3. set up the database + demo data
npx prisma db push
npm run db:seed

# 4. build and start
npm run build
npm start
```

Open http://localhost:3000 and log in with `demo@relay.app` / `relay1234`.
