#!/bin/sh
set -e

echo "→ Waiting for PostgreSQL to be ready..."
until pg_isready -h db -p 5432 -U postgres >/dev/null 2>&1; do
  sleep 1
done
echo "✓ PostgreSQL is up."

echo "→ Applying database schema..."
npx prisma db push --skip-generate --accept-data-loss

# Seed demo data only on the first run (when there are no users yet)
USER_COUNT=$(node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>{process.stdout.write(String(c));return p.\$disconnect()}).catch(()=>{process.stdout.write('0')})")
if [ "$USER_COUNT" = "0" ]; then
  echo "→ Seeding demo data (first run)..."
  npm run db:seed
else
  echo "✓ Existing data found ($USER_COUNT users) — skipping seed."
fi

echo ""
echo "=================================================="
echo "  Relay CRM is starting at http://localhost:3000"
echo "  Login →  demo@relay.app  /  relay1234"
echo "=================================================="
echo ""

exec npm start
