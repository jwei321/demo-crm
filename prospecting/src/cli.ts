import 'dotenv/config';
import { runDiscovery, type DiscoverOptions } from './discovery/run.js';
import { closeDb } from './db/client.js';

function parseArgs(argv: string[]): DiscoverOptions {
  const args = new Map<string, string>();
  for (const arg of argv) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args.set(key, rest.join('=') || 'true');
  }

  const source = args.get('source');
  if (source !== 'csv' && source !== 'website' && source !== 'hunter' && source !== 'apollo') {
    printUsage();
    process.exit(1);
  }

  return {
    source,
    limit: Number(args.get('limit') ?? 10),
    dryRun: args.get('dry-run') === 'true',
    csvFile: args.get('file'),
    domain: args.get('domain'),
    companyName: args.get('company'),
  };
}

function printUsage() {
  console.log(`
Benefit Scope App -- prospect discovery

Usage:
  npm run discover -- --source=csv --file=./sales-nav-export.csv [--limit=10] [--dry-run]
  npm run discover -- --source=website --domain=acme.com --company="Acme Pte Ltd" [--limit=10] [--dry-run]
  npm run discover -- --source=hunter --domain=acme.com --company="Acme Pte Ltd" [--limit=10] [--dry-run]
  npm run discover -- --source=apollo --domain=acme.com --company="Acme Pte Ltd" [--limit=10] [--dry-run]

Options:
  --source     csv | website | hunter | apollo   (required)
  --limit      max new contacts to insert this run (default 10)
  --dry-run    show what would be inserted without writing to the database
  --file       path to a Sales Navigator CSV export (source=csv)
  --domain     company domain, e.g. acme.com (source=website|hunter|apollo)
  --company    display name for the company (optional, inferred when possible)
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log(`\nRunning discovery: source=${opts.source} limit=${opts.limit} dryRun=${opts.dryRun}\n`);

  const result = await runDiscovery(opts);

  for (const row of result.rows) {
    const p = row.prospect;
    const tag =
      row.status === 'duplicate' ? 'DUPLICATE' : row.status === 'skipped-limit' ? 'SKIPPED (limit reached)' : 'NEW';
    const review = row.needsReview ? '  [NEEDS REVIEW]' : '';
    console.log(`  [${tag}]${review} ${p.fullName ?? '(unknown name)'} -- ${p.title ?? 'no title'} @ ${p.company} -- ${p.email ?? 'no email'}`);
  }

  console.log(`\nFound: ${result.found}  Inserted: ${result.inserted}  Duplicates: ${result.duplicates}  Flagged for review: ${result.flagged}`);
  if (opts.dryRun) console.log('(dry run -- nothing was written to the database)');

  closeDb();
}

main().catch((err) => {
  console.error('\nDiscovery failed:', err instanceof Error ? err.message : err);
  closeDb();
  process.exit(1);
});
