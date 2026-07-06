import type { EmailConfidence } from './types.js';

// Common free/personal webmail providers. An HR contact using one of these
// instead of a company domain is unusual and worth a human glance before sending.
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.com.sg',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',
  'msn.com',
  'gmx.com',
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  return email.slice(at + 1).toLowerCase();
}

export function isValidEmailShape(email: string): boolean {
  // Deliberately simple: just enough to reject obvious garbage from scraped text.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export interface EmailClassification {
  confidence: EmailConfidence;
  needsReview: boolean;
  reason?: string;
}

/**
 * Classifies an email as a clear business contact vs. one that looks personal
 * or otherwise uncertain, per the "flag for review" compliance requirement.
 */
export function classifyEmail(email: string, companyDomain?: string | null): EmailClassification {
  const domain = emailDomain(email);
  if (!domain) {
    return { confidence: 'unknown', needsReview: true, reason: 'Email address could not be parsed.' };
  }

  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return {
      confidence: 'personal_uncertain',
      needsReview: true,
      reason: `Uses a personal webmail domain (${domain}), not a company address.`,
    };
  }

  if (companyDomain && domain !== companyDomain.toLowerCase().replace(/^www\./, '')) {
    return {
      confidence: 'personal_uncertain',
      needsReview: true,
      reason: `Email domain (${domain}) does not match the company's domain (${companyDomain}).`,
    };
  }

  return { confidence: 'business', needsReview: false };
}
