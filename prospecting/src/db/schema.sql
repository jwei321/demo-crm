-- Benefit Scope App -- prospecting database schema
-- SQLite. Applied idempotently on every startup via client.ts.

CREATE TABLE IF NOT EXISTS contacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name        TEXT,
  last_name         TEXT,
  full_name         TEXT NOT NULL,
  title             TEXT,
  company           TEXT NOT NULL,
  company_domain    TEXT,
  email             TEXT,
  email_normalized  TEXT,
  phone             TEXT,
  linkedin_url      TEXT,
  source            TEXT NOT NULL CHECK (source IN ('website', 'hunter', 'apollo', 'csv_import')),
  source_detail     TEXT,
  email_confidence  TEXT NOT NULL DEFAULT 'unknown' CHECK (email_confidence IN ('business', 'personal_uncertain', 'unknown')),
  needs_review      INTEGER NOT NULL DEFAULT 0,
  review_reason     TEXT,
  status            TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'followed_up', 'replied', 'opted_out')),
  date_found        TEXT NOT NULL DEFAULT (datetime('now')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Dedupe key: only enforced when an email is actually known.
-- CSV imports without an email (Sales Navigator rarely exposes one) are deduped
-- in application code by name+company instead (see dedupe.ts).
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email_unique
  ON contacts(email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
CREATE INDEX IF NOT EXISTS idx_contacts_name_company ON contacts(full_name, company);

-- Audit trail for every discovery run (required for compliance logging).
CREATE TABLE IF NOT EXISTS discovery_runs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source            TEXT NOT NULL,
  query             TEXT,
  found_count       INTEGER NOT NULL DEFAULT 0,
  inserted_count    INTEGER NOT NULL DEFAULT 0,
  duplicate_count   INTEGER NOT NULL DEFAULT 0,
  flagged_count     INTEGER NOT NULL DEFAULT 0,
  dry_run           INTEGER NOT NULL DEFAULT 0,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  error             TEXT
);
