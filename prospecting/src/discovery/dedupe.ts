import type Database from 'better-sqlite3';
import type { ProspectInput } from './types.js';
import { normalizeEmail } from './emailHeuristics.js';

/**
 * Checks whether a prospect is already in the database.
 * Primary key: normalized email. Fallback (used for CSV imports that lack an
 * email, e.g. Sales Navigator exports): exact full name + company match.
 */
export function findExistingContact(
  db: Database.Database,
  prospect: ProspectInput,
): { id: number } | undefined {
  if (prospect.email) {
    const row = db
      .prepare('SELECT id FROM contacts WHERE email_normalized = ?')
      .get(normalizeEmail(prospect.email)) as { id: number } | undefined;
    if (row) return row;
  }

  const fullName = (prospect.fullName ?? `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`).trim();
  if (!fullName || !prospect.company) return undefined;

  const row = db
    .prepare(
      'SELECT id FROM contacts WHERE lower(full_name) = lower(?) AND lower(company) = lower(?)',
    )
    .get(fullName, prospect.company) as { id: number } | undefined;
  return row;
}
