export type ContactSource = 'website' | 'hunter' | 'apollo' | 'csv_import';
export type ContactStatus = 'new' | 'contacted' | 'followed_up' | 'replied' | 'opted_out';
export type EmailConfidence = 'business' | 'personal_uncertain' | 'unknown';

/** A single prospect as produced by any discovery source, before it hits the DB. */
export interface ProspectInput {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  company: string;
  companyDomain?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  source: ContactSource;
  sourceDetail?: string;
  /** Set by a source when it already knows the result is low-confidence (e.g. scraped). */
  needsReview?: boolean;
  reviewReason?: string;
}

/** A row as stored in the contacts table. */
export interface ContactRow {
  id: number;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  title: string | null;
  company: string;
  company_domain: string | null;
  email: string | null;
  email_normalized: string | null;
  phone: string | null;
  linkedin_url: string | null;
  source: ContactSource;
  source_detail: string | null;
  email_confidence: EmailConfidence;
  needs_review: 0 | 1;
  review_reason: string | null;
  status: ContactStatus;
  date_found: string;
  created_at: string;
  updated_at: string;
}

export const HR_TITLE_KEYWORDS = [
  'human resources',
  'hr manager',
  'hr director',
  'hr business partner',
  'head of hr',
  'head of people',
  'people operations',
  'people ops',
  'people & culture',
  'people and culture',
  'talent acquisition',
  'chro',
  'chief people officer',
  'chief human resources officer',
  'benefits manager',
  'compensation and benefits',
  'compensation & benefits',
  'total rewards',
  'employee benefits',
] as const;

export function looksLikeHrTitle(title: string | undefined | null): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return HR_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}
