import { getDb } from '../db/client.js';
import { insertProspect } from './insert.js';
import type { ProspectInput } from './types.js';
import { parseSalesNavigatorCsv } from './sources/csvImport.js';
import { scrapeCompanyWebsite } from './sources/websiteScraper.js';
import { searchHunterDomain } from './sources/hunter.js';
import { searchApolloDomain } from './sources/apollo.js';

export interface DiscoverOptions {
  source: 'csv' | 'website' | 'hunter' | 'apollo';
  limit: number;
  dryRun: boolean;
  csvFile?: string;
  domain?: string;
  companyName?: string;
}

export interface DiscoverResult {
  found: number;
  inserted: number;
  duplicates: number;
  flagged: number;
  rows: Array<{ status: 'inserted' | 'duplicate' | 'skipped-limit'; prospect: ProspectInput; needsReview?: boolean }>;
}

async function fetchProspects(opts: DiscoverOptions): Promise<ProspectInput[]> {
  switch (opts.source) {
    case 'csv': {
      if (!opts.csvFile) throw new Error('--file is required for --source=csv');
      return parseSalesNavigatorCsv(opts.csvFile);
    }
    case 'website': {
      if (!opts.domain) throw new Error('--domain is required for --source=website');
      return scrapeCompanyWebsite({ domain: opts.domain, companyName: opts.companyName ?? opts.domain });
    }
    case 'hunter': {
      if (!opts.domain) throw new Error('--domain is required for --source=hunter');
      const apiKey = process.env.HUNTER_API_KEY;
      if (!apiKey) throw new Error('HUNTER_API_KEY is not set. Add it to prospecting/.env');
      return searchHunterDomain({ domain: opts.domain, companyName: opts.companyName, limit: opts.limit, apiKey });
    }
    case 'apollo': {
      if (!opts.domain) throw new Error('--domain is required for --source=apollo');
      const apiKey = process.env.APOLLO_API_KEY;
      if (!apiKey) throw new Error('APOLLO_API_KEY is not set. Add it to prospecting/.env');
      return searchApolloDomain({ domain: opts.domain, companyName: opts.companyName, limit: opts.limit, apiKey });
    }
  }
}

export async function runDiscovery(opts: DiscoverOptions): Promise<DiscoverResult> {
  const db = getDb();
  const startedAt = new Date().toISOString();

  const runStmt = db.prepare(`
    INSERT INTO discovery_runs (source, query, dry_run, started_at)
    VALUES (@source, @query, @dry_run, @started_at)
  `);
  const runInfo = runStmt.run({
    source: opts.source,
    query: opts.domain ?? opts.csvFile ?? null,
    dry_run: opts.dryRun ? 1 : 0,
    started_at: startedAt,
  });
  const runId = Number(runInfo.lastInsertRowid);

  const result: DiscoverResult = { found: 0, inserted: 0, duplicates: 0, flagged: 0, rows: [] };

  try {
    const prospects = await fetchProspects(opts);
    result.found = prospects.length;

    // Dry runs execute the real dedupe/insert logic against the live DB inside
    // a transaction, then roll it back -- so the preview reflects reality
    // (including dedupe against existing rows) without persisting anything.
    const applyTxn = db.transaction((toInsert: ProspectInput[]) => {
      for (const prospect of toInsert) {
        if (result.inserted >= opts.limit) {
          result.rows.push({ status: 'skipped-limit', prospect });
          continue;
        }

        const outcome = insertProspect(db, prospect);
        if (outcome.outcome === 'duplicate') {
          result.duplicates += 1;
          result.rows.push({ status: 'duplicate', prospect });
        } else {
          result.inserted += 1;
          if (outcome.needsReview) result.flagged += 1;
          result.rows.push({ status: 'inserted', prospect, needsReview: outcome.needsReview });
        }
      }
      if (opts.dryRun) throw new RollbackDryRun();
    });

    try {
      applyTxn(prospects);
    } catch (e) {
      if (!(e instanceof RollbackDryRun)) throw e;
    }

    db.prepare(`
      UPDATE discovery_runs
      SET found_count = @found, inserted_count = @inserted, duplicate_count = @duplicates,
          flagged_count = @flagged, finished_at = @finished_at
      WHERE id = @id
    `).run({
      id: runId,
      found: result.found,
      inserted: result.inserted,
      duplicates: result.duplicates,
      flagged: result.flagged,
      finished_at: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    db.prepare('UPDATE discovery_runs SET error = @error, finished_at = @finished_at WHERE id = @id').run({
      id: runId,
      error: err instanceof Error ? err.message : String(err),
      finished_at: new Date().toISOString(),
    });
    throw err;
  }
}

class RollbackDryRun extends Error {}
