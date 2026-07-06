# Benefit Scope App — Prospecting System

Automated B2B email prospecting for Singapore corporate employee-benefits outreach.
Built in stages; this covers **Stage 1: prospect discovery + database**.

## Setup

```bash
cd prospecting
npm install
cp .env.example .env   # then fill in HUNTER_API_KEY / APOLLO_API_KEY if you want to use those sources
```

The SQLite database is created automatically at `data/prospecting.db` on first run (gitignored).

## Usage

```bash
# Import a CSV you manually exported from LinkedIn Sales Navigator
npm run discover -- --source=csv --file=./sales-nav-export.csv --dry-run
npm run discover -- --source=csv --file=./sales-nav-export.csv

# Scrape a company's own About/Contact/Team pages (never LinkedIn)
npm run discover -- --source=website --domain=acme.com --company="Acme Pte Ltd"

# Hunter.io domain search, filtered server-side to the HR department
npm run discover -- --source=hunter --domain=acme.com --company="Acme Pte Ltd" --limit=10

# Apollo.io people search for HR titles at a domain
npm run discover -- --source=apollo --domain=acme.com --company="Acme Pte Ltd" --limit=10
```

Always run with `--dry-run` first to preview what would be inserted (including dedupe
against existing rows) before writing anything.

## What each run does

1. Fetches candidate contacts from the chosen source.
2. Dedupes against the existing database: by normalized email when known, otherwise by
   exact name + company (used for Sales Navigator CSV rows that don't include an email).
3. Classifies each email as `business`, `personal_uncertain`, or `unknown`, and sets
   `needs_review = 1` on anything uncertain (personal webmail domain, mismatched company
   domain, missing email, low source-confidence score).
4. Stops once `--limit` new (non-duplicate) contacts have been inserted (default 10).
5. Records every run in `discovery_runs` for audit purposes, dry-run or not.

## Schema

See `src/db/schema.sql`. Key table: `contacts`

| Column | Notes |
| --- | --- |
| `email` / `email_normalized` | `email_normalized` has a unique index (partial — only enforced when non-null) |
| `source` | `website` \| `hunter` \| `apollo` \| `csv_import` |
| `email_confidence` | `business` \| `personal_uncertain` \| `unknown` |
| `needs_review` / `review_reason` | flips to 1 whenever a human should look before sending |
| `status` | `new` → `contacted` → `followed_up` → `replied` / `opted_out` (set by later stages) |

## Notes on the sources

- **CSV import**: assumes a manual export from LinkedIn Sales Navigator (or similar). No
  LinkedIn scraping happens anywhere in this codebase.
- **Website scraper**: only ever requests pages on the target company's own domain, checks
  `robots.txt` first, and identifies itself with a descriptive `User-Agent`. It only extracts
  `mailto:` links, so it can't invent an email that isn't published on the page.
- **Hunter.io / Apollo.io**: standard API usage with your own API key; nothing scraped.

## Not yet built (later stages)

Sending, follow-ups, reply handling, and scheduling come in later stages — this module only
discovers and stores contacts. Nothing here sends email.
