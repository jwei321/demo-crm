import type Database from 'better-sqlite3';
import type { ProspectInput } from './types.js';
import { classifyEmail, isValidEmailShape, normalizeEmail } from './emailHeuristics.js';
import { findExistingContact } from './dedupe.js';

export type InsertOutcome =
  | { outcome: 'inserted'; id: number; needsReview: boolean }
  | { outcome: 'duplicate'; existingId: number };

/**
 * Inserts a single prospect if it isn't already known. Applies the email
 * confidence check so uncertain contacts are flagged rather than silently
 * queued for sending later.
 */
export function insertProspect(db: Database.Database, prospect: ProspectInput): InsertOutcome {
  const existing = findExistingContact(db, prospect);
  if (existing) {
    return { outcome: 'duplicate', existingId: existing.id };
  }

  const fullName = (prospect.fullName ?? `${prospect.firstName ?? ''} ${prospect.lastName ?? ''}`).trim();

  let email: string | null = prospect.email?.trim() || null;
  let emailNormalized: string | null = null;
  let confidence: 'business' | 'personal_uncertain' | 'unknown' = 'unknown';
  let needsReview = prospect.needsReview ?? false;
  let reviewReason = prospect.reviewReason;

  if (email) {
    if (!isValidEmailShape(email)) {
      needsReview = true;
      reviewReason = reviewReason ?? 'Email address failed basic format validation.';
    } else {
      emailNormalized = normalizeEmail(email);
      const classification = classifyEmail(email, prospect.companyDomain);
      confidence = classification.confidence;
      if (classification.needsReview) {
        needsReview = true;
        reviewReason = reviewReason ?? classification.reason;
      }
    }
  } else {
    // No email at all (e.g. a Sales Navigator export without one) -- can't be
    // sent to yet, so it always needs a human pass to enrich or discard.
    needsReview = true;
    reviewReason = reviewReason ?? 'No email address found yet; needs enrichment before it can be contacted.';
  }

  const stmt = db.prepare(`
    INSERT INTO contacts (
      first_name, last_name, full_name, title, company, company_domain,
      email, email_normalized, phone, linkedin_url,
      source, source_detail, email_confidence, needs_review, review_reason
    ) VALUES (
      @first_name, @last_name, @full_name, @title, @company, @company_domain,
      @email, @email_normalized, @phone, @linkedin_url,
      @source, @source_detail, @email_confidence, @needs_review, @review_reason
    )
  `);

  const result = stmt.run({
    first_name: prospect.firstName ?? null,
    last_name: prospect.lastName ?? null,
    full_name: fullName,
    title: prospect.title ?? null,
    company: prospect.company,
    company_domain: prospect.companyDomain ?? null,
    email,
    email_normalized: emailNormalized,
    phone: prospect.phone ?? null,
    linkedin_url: prospect.linkedinUrl ?? null,
    source: prospect.source,
    source_detail: prospect.sourceDetail ?? null,
    email_confidence: confidence,
    needs_review: needsReview ? 1 : 0,
    review_reason: reviewReason ?? null,
  });

  return { outcome: 'inserted', id: Number(result.lastInsertRowid), needsReview };
}
