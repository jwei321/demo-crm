import type { ProspectInput } from '../types.js';

/**
 * Hunter.io Domain Search -- https://hunter.io/api-documentation/v2#domain-search
 * Filters to the HR department server-side, then we still run our own
 * classifyEmail() pass on top for the review flag.
 */

interface HunterEmailResult {
  value: string;
  type: 'personal' | 'generic';
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
  linkedin: string | null;
  phone_number: string | null;
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    organization: string | null;
    emails: HunterEmailResult[];
  };
  errors?: { id: string; code: number; details: string }[];
}

export interface HunterSearchOptions {
  domain: string;
  companyName?: string;
  limit?: number;
  apiKey: string;
}

export async function searchHunterDomain(opts: HunterSearchOptions): Promise<ProspectInput[]> {
  const url = new URL('https://api.hunter.io/v2/domain-search');
  url.searchParams.set('domain', opts.domain);
  url.searchParams.set('department', 'hr');
  url.searchParams.set('limit', String(opts.limit ?? 10));
  url.searchParams.set('api_key', opts.apiKey);

  const res = await fetch(url.toString());
  const body = (await res.json()) as HunterDomainSearchResponse;

  if (!res.ok) {
    const detail = body.errors?.map((e) => e.details).join('; ') ?? res.statusText;
    throw new Error(`Hunter.io API error (${res.status}): ${detail}`);
  }

  const companyName = opts.companyName ?? body.data.organization ?? opts.domain;

  return body.data.emails.map((e) => ({
    firstName: e.first_name ?? undefined,
    lastName: e.last_name ?? undefined,
    fullName: [e.first_name, e.last_name].filter(Boolean).join(' ') || undefined,
    title: e.position ?? undefined,
    company: companyName,
    companyDomain: opts.domain,
    email: e.value,
    phone: e.phone_number ?? undefined,
    linkedinUrl: e.linkedin ?? undefined,
    source: 'hunter' as const,
    sourceDetail: `hunter.io domain-search:${opts.domain}`,
    // Hunter's own confidence score is a useful extra signal on top of ours.
    needsReview: e.confidence < 70,
    reviewReason: e.confidence < 70 ? `Hunter.io confidence score is low (${e.confidence}/100).` : undefined,
  }));
}
