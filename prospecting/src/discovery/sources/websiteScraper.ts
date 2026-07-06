import * as cheerio from 'cheerio';
import { HR_TITLE_KEYWORDS, type ProspectInput } from '../types.js';

/**
 * Fetches a company's own public pages (About/Contact/Leadership/Team) and
 * looks for HR-related names, titles, and mailto: links.
 *
 * This only ever talks to the target company's own website -- never LinkedIn
 * or any other third-party platform. Results are inherently best-effort (HTML
 * structure varies wildly), so every match is flagged needs_review by default;
 * treat this as a lead for a human to confirm, not a ready-to-send contact.
 */

const CANDIDATE_PATHS = [
  '/',
  '/about',
  '/about-us',
  '/company',
  '/company/about',
  '/contact',
  '/contact-us',
  '/team',
  '/our-team',
  '/leadership',
  '/people',
  '/careers',
];

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'BenefitScopeApp-ProspectResearch/1.0 (+manual, low-volume, respects robots.txt)';

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function isScrapingAllowed(origin: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(new URL('/robots.txt', origin).toString(), {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return true; // no robots.txt -> nothing disallowed
    const body = await res.text();
    // Minimal, conservative check: only look at the wildcard user-agent block.
    const lines = body.split('\n').map((l) => l.trim());
    let inWildcardBlock = false;
    for (const line of lines) {
      if (/^user-agent:\s*\*/i.test(line)) {
        inWildcardBlock = true;
        continue;
      }
      if (/^user-agent:/i.test(line)) {
        inWildcardBlock = false;
        continue;
      }
      if (inWildcardBlock) {
        const disallow = line.match(/^disallow:\s*(\S*)/i);
        if (disallow && disallow[1] && path.startsWith(disallow[1])) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

function extractMailtoContacts($: cheerio.CheerioAPI, companyDomain: string): ProspectInput[] {
  const results: ProspectInput[] = [];

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (!email || !email.includes('@')) return;

    // Look at nearby text for a name/title (best-effort: parent block text).
    const context = $(el).closest('div, li, tr, section, article').text().replace(/\s+/g, ' ').trim();
    const hasHrContext = HR_TITLE_KEYWORDS.some((kw) => context.toLowerCase().includes(kw));
    const linkText = $(el).text().trim();

    results.push({
      fullName: linkText && linkText.includes('@') === false ? linkText : 'Unknown (scraped)',
      title: hasHrContext ? extractTitleFromContext(context) : undefined,
      company: companyDomain,
      companyDomain,
      email,
      source: 'website',
      sourceDetail: 'mailto link',
      needsReview: true,
      reviewReason: 'Scraped from a mailto: link; name/title association is best-effort and unverified.',
    });
  });

  return results;
}

function extractTitleFromContext(context: string): string | undefined {
  const lower = context.toLowerCase();
  const kw = HR_TITLE_KEYWORDS.find((k) => lower.includes(k));
  return kw;
}

export interface ScrapeOptions {
  /** e.g. "acme.com" -- used to build candidate URLs and tag results. */
  domain: string;
  /** Display name for the company, stored on each contact row. */
  companyName: string;
  respectRobotsTxt?: boolean;
}

export async function scrapeCompanyWebsite(opts: ScrapeOptions): Promise<ProspectInput[]> {
  const origin = `https://${opts.domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  const found: ProspectInput[] = [];
  const seenEmails = new Set<string>();

  for (const path of CANDIDATE_PATHS) {
    if (opts.respectRobotsTxt !== false) {
      const allowed = await isScrapingAllowed(origin, path);
      if (!allowed) continue;
    }

    const html = await fetchPage(origin + path);
    if (!html) continue;

    const $ = cheerio.load(html);
    const pageContacts = extractMailtoContacts($, opts.domain).map((c) => ({
      ...c,
      company: opts.companyName,
      sourceDetail: `${origin}${path}`,
    }));

    for (const contact of pageContacts) {
      const key = contact.email?.toLowerCase();
      if (key && !seenEmails.has(key)) {
        seenEmails.add(key);
        found.push(contact);
      }
    }
  }

  return found;
}
