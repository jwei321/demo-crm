# Market & Planning Hub (`/hub`)

A single-page, dark-themed market-intelligence and financial-planning dashboard,
recreated in Next.js from the design handoff. It refreshes automatically every week.

## Layout

- `layout.tsx` — loads the Instrument Sans + IBM Plex Mono fonts and scopes them to the Hub.
- `page.tsx` — server component; reads `data/market.json` via `getMarketData()` and renders statically.
- `MarketHub.tsx` — the whole interactive page (client component). Faithful port of the design:
  header + ticker tape, markets (watchlist / candlestick chart / performance rail), S&P sector
  orbs, asset-class ladder, macro cards, company analyzer, AIA fund analyzer, horizon outlook,
  and the planning tools (growth, inflation, retirement gap, rule of 72, risk quiz), plus the CTA.

## Data

- **`data/market.json`** — the weekly-refreshed dataset (indices, sectors, macro readings,
  funds, fund facts) plus a `meta` block (timestamp / week / source provenance). This is the
  file the weekly job rewrites.
- **`src/lib/market/types.ts`** — TypeScript types for that data.
- **`src/lib/market/static.ts`** — editorial copy that rarely changes (sector descriptions,
  macro "what's next" lines and source links, the outlook reasoning, the company list, the risk
  quiz and profiles). The weekly job does **not** touch this.
- **`src/lib/market/data.ts`** — `getMarketData()` loader used by the server page.

## Automation

- `scripts/update-market-data.mjs` + `.github/workflows/weekly-market-update.yml` — weekly refresh.
- `scripts/monthly-review.mjs` + `.github/workflows/monthly-review.yml` — monthly "what to add" review.

## Disclaimers

Fund figures and some macro readings are illustrative and labelled as such. The page carries
"educational, not advice" disclaimers throughout, and every macro card links to its official source.
