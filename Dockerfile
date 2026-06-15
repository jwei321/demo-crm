# Relay CRM — self-contained app image
FROM node:22-slim

WORKDIR /app

# OpenSSL is required by Prisma; postgresql-client gives us pg_isready for the wait loop
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build.
# A placeholder DATABASE_URL keeps `next build` happy when no DB is reachable at
# image-build time; docker-compose overrides it with the real value at runtime.
COPY . .
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
RUN npx prisma generate && npm run build

EXPOSE 3000

# entrypoint waits for the DB, applies the schema, seeds demo data on first run, then starts
RUN chmod +x ./docker/entrypoint.sh
CMD ["./docker/entrypoint.sh"]
