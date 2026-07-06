import type { ProspectInput } from '../types.js';

/**
 * Apollo.io People Search -- https://docs.apollo.io/reference/people-search
 *
 * Note: Apollo's search endpoint usually returns masked/locked emails; actually
 * revealing an email consumes Apollo credits via the People Enrichment
 * endpoint. This module does both steps but keeps them separate so you can
 * see match counts before spending credits (`enrich: false` to skip).
 */

const HR_TITLES = [
  'Head of HR',
  'HR Manager',
  'HR Director',
  'HR Business Partner',
  'Head of People',
  'People Operations',
  'People Manager',
  'Talent Acquisition',
  'Chief People Officer',
  'Chief Human Resources Officer',
  'Benefits Manager',
  'Compensation and Benefits Manager',
  'Total Rewards Manager',
];

interface ApolloPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  email: string | null;
  email_status: string | null;
  linkedin_url: string | null;
  organization: { name: string | null; primary_domain: string | null } | null;
}

interface ApolloSearchResponse {
  people: ApolloPerson[];
}

export interface ApolloSearchOptions {
  domain: string;
  companyName?: string;
  limit?: number;
  apiKey: string;
  /** Actually reveal emails (spends Apollo credits). Defaults to true. */
  enrich?: boolean;
}

async function searchPeople(opts: ApolloSearchOptions): Promise<ApolloPerson[]> {
  const res = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': opts.apiKey,
    },
    body: JSON.stringify({
      q_organization_domains: opts.domain,
      person_titles: HR_TITLES,
      page: 1,
      per_page: opts.limit ?? 10,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo.io search error (${res.status}): ${text}`);
  }

  const body = (await res.json()) as ApolloSearchResponse;
  return body.people ?? [];
}

async function enrichPerson(apiKey: string, personId: string): Promise<ApolloPerson | null> {
  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ id: personId, reveal_personal_emails: false }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { person: ApolloPerson };
  return body.person ?? null;
}

export async function searchApolloDomain(opts: ApolloSearchOptions): Promise<ProspectInput[]> {
  const people = await searchPeople(opts);
  const shouldEnrich = opts.enrich ?? true;

  const enriched: ApolloPerson[] = [];
  for (const person of people) {
    if (person.email && person.email_status === 'verified') {
      enriched.push(person);
      continue;
    }
    if (shouldEnrich) {
      const full = await enrichPerson(opts.apiKey, person.id);
      enriched.push(full ?? person);
    } else {
      enriched.push(person);
    }
  }

  const companyName = opts.companyName ?? enriched[0]?.organization?.name ?? opts.domain;

  return enriched
    .filter((p) => p.email) // no point storing a row we can never send to
    .map((p) => ({
      firstName: p.first_name ?? undefined,
      lastName: p.last_name ?? undefined,
      fullName: p.name ?? undefined,
      title: p.title ?? undefined,
      company: companyName,
      companyDomain: p.organization?.primary_domain ?? opts.domain,
      email: p.email!,
      linkedinUrl: p.linkedin_url ?? undefined,
      source: 'apollo' as const,
      sourceDetail: `apollo.io people-search:${opts.domain}`,
      needsReview: p.email_status !== 'verified',
      reviewReason: p.email_status !== 'verified' ? `Apollo email status: ${p.email_status ?? 'unknown'}.` : undefined,
    }));
}
