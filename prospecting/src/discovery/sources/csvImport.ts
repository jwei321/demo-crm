import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import type { ProspectInput } from '../types.js';

/**
 * Imports contacts from a CSV you exported yourself from LinkedIn Sales
 * Navigator (Manual export, never scraped). Sales Navigator exports rarely
 * include a work email -- those rows come through with email left blank and
 * get flagged for enrichment (via Hunter/Apollo/website lookup) or manual entry.
 *
 * Column names are matched flexibly (case/spacing-insensitive) against common
 * Sales Navigator / generic CRM export headers.
 */

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'last'],
  fullName: ['name', 'full name', 'contact name'],
  title: ['title', 'position', 'job title', 'current title', 'current role'],
  company: ['company', 'company name', 'current company', 'account name', 'organization'],
  companyDomain: ['company domain', 'domain', 'website'],
  email: ['email', 'email address', 'work email'],
  phone: ['phone', 'phone number', 'mobile'],
  linkedinUrl: ['profile url', 'linkedin url', 'linkedin', 'public profile url', 'li profile'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const map: Partial<Record<keyof typeof HEADER_ALIASES, string>> = {};
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = normalizedHeaders.find((h) => aliases.includes(h.norm));
    if (match) map[field as keyof typeof HEADER_ALIASES] = match.raw;
  }
  return map;
}

export function parseSalesNavigatorCsv(filePath: string): ProspectInput[] {
  const raw = readFileSync(filePath, 'utf-8');
  const records: Record<string, string>[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  if (records.length === 0) return [];

  const headerMap = buildHeaderMap(Object.keys(records[0]));
  if (!headerMap.company && !headerMap.fullName && !headerMap.firstName) {
    throw new Error(
      'Could not find recognizable "Company" and "Name" columns in the CSV. ' +
        `Found headers: ${Object.keys(records[0]).join(', ')}`,
    );
  }

  const prospects: ProspectInput[] = [];
  for (const row of records) {
    const get = (field: keyof typeof HEADER_ALIASES) => {
      const header = headerMap[field];
      return header ? row[header]?.trim() || undefined : undefined;
    };

    const company = get('company');
    if (!company) continue; // can't target a company we don't know

    const firstName = get('firstName');
    const lastName = get('lastName');
    const fullName = get('fullName') ?? [firstName, lastName].filter(Boolean).join(' ');
    if (!fullName) continue;

    prospects.push({
      firstName,
      lastName,
      fullName,
      title: get('title'),
      company,
      companyDomain: get('companyDomain'),
      email: get('email'),
      phone: get('phone'),
      linkedinUrl: get('linkedinUrl'),
      source: 'csv_import',
      sourceDetail: filePath,
    });
  }

  return prospects;
}
