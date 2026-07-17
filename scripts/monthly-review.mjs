#!/usr/bin/env node
/**
 * Monthly "what should I add?" review for the Market & Planning Hub.
 *
 * Runs on the 1st of each month (see .github/workflows/monthly-review.yml).
 * It reads data/market.json, writes a dated review section to the TOP of
 * docs/MONTHLY_REVIEW.md (newest first), and — if REVIEW_BODY_OUT is set —
 * also writes the same body to that path so the workflow can open a GitHub
 * issue with it (a monthly nudge in your inbox).
 *
 * The review combines:
 *   - a data-driven market snapshot for the month,
 *   - a data-health check (freshness, live vs fallback sources),
 *   - a rotating slice of the enhancement backlog (so it stays fresh),
 *   - the full backlog for reference.
 *
 * No non-builtin dependencies.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "data", "market.json");
const DOC = path.join(ROOT, "docs", "MONTHLY_REVIEW.md");
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// The enhancement backlog. The monthly review surfaces a rotating window of
// these so every review highlights a different, concrete next step.
const BACKLOG = [
  "**Live AIA ILP fund prices** — replace the illustrative fund NAV/size/returns with the real weekly figures from the AIA fund-performance page (or a manually maintained weekly CSV). This is the single biggest fidelity upgrade.",
  "**Turn on live macro** — add a free `FRED_API_KEY` in repo Secrets so CPI, core CPI, unemployment, VIX and Fed funds update from source each week instead of drifting.",
  "**Fill the last two macro cards** — wire ISM Manufacturing PMI and Singapore CPI (SingStat table-builder API) so all eight macro readings are live.",
  "**\"This week in markets\" summary** — auto-generate a 2–3 sentence recap of the week's biggest movers and put it at the top, so returning visitors instantly see what changed.",
  "**Weekly email digest** — an opt-in that emails the week's snapshot plus one chart every Monday (advisers can forward it to clients).",
  "**Real OHLC candles** — feed the candlestick chart with actual weekly open/high/low/close from the data provider instead of the current synthetic candles.",
  "**SGD/USD currency toggle** — let users flip prices and planning tools between SGD and USD.",
  "**CPF-aware retirement modelling** — layer CPF OA/SA/MA and CPF LIFE payouts into the Retirement Gap tool for genuine Singapore accuracy.",
  "**Fund comparison mode** — pick 2–3 AIA funds and view allocation, returns and risk side by side.",
  "**Rates & bonds panel** — SORA, SGS yields and the latest T-bill cut-off yield; highly relevant to Singapore savers right now.",
  "**Dividend / passive-income tool** — yield-on-cost, reinvestment (DRIP) and an income-in-retirement projection.",
  "**Real company fundamentals** — replace the hash-generated analyzer figures with a fundamentals API, clearly sourced.",
  "**Accessibility pass** — keyboard focus for the sector orbs, ARIA labels on the SVG charts, and a contrast audit.",
  "**Economic-calendar strip** — upcoming CPI, FOMC and MAS review dates, tied to the macro \"what's next\" lines.",
  "**One-page PDF snapshot** — a print/export view an adviser can share in a meeting.",
  "**\"What changed since last week\" banner** — a small diff of the biggest weekly moves at the top of the page.",
  "**Privacy-friendly analytics** — see which sections advisers actually use, to prioritise the backlog.",
  "**Visual-regression tests** — snapshot the Hub so a weekly data change can never silently break the layout.",
];

function fmtPct(v) {
  return (v >= 0 ? "+" : "") + Number(v).toFixed(1) + "%";
}
function extremes(items, valueOf) {
  let best = items[0];
  let worst = items[0];
  for (const it of items) {
    if (valueOf(it) > valueOf(best)) best = it;
    if (valueOf(it) < valueOf(worst)) worst = it;
  }
  return { best, worst };
}
function daysSince(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  return Math.round((Date.now() - then) / 86400000);
}

function buildReview(data, now) {
  const month = MONTH_NAMES[now.getUTCMonth()];
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  const monthIndex = year * 12 + now.getUTCMonth();

  // --- market snapshot ---
  const instr = extremes(data.instruments, (i) => i.chg.YTD);
  const secs = data.sectors;
  const secPos = secs.filter((s) => s.chg.YTD >= 0).length;
  const secX = extremes(secs, (s) => s.chg.YTD);
  const funds = extremes(data.funds, (f) => f.ytd);
  const vix = data.macro.find((m) => m.name === "VIX");
  const cpi = data.macro.find((m) => m.name === "CPI (YOY)");
  const unemp = data.macro.find((m) => m.name === "UNEMPLOYMENT");
  const fed = data.macro.find((m) => m.name === "FED FUNDS");

  // --- data health ---
  const age = daysSince(data.meta.updatedISO);
  const genBy = data.meta.generatedBy;
  const sources = data.meta.sources || [];
  const fredLive = sources.some((s) => /FRED/i.test(s));
  const fundsIllustrative = true; // funds are always illustrative until source #1 is done

  // --- rotating backlog window (5 items, cycles through the whole list) ---
  const pickN = 5;
  const start = ((monthIndex % BACKLOG.length) + BACKLOG.length) % BACKLOG.length;
  const rotating = [];
  for (let i = 0; i < pickN; i++) rotating.push(BACKLOG[(start + i) % BACKLOG.length]);

  const L = [];
  L.push(`## Review — ${month} ${year}`);
  L.push(`_Generated ${today} · data for week of ${data.meta.weekOf}_`);
  L.push("");
  L.push("### 📈 Market snapshot (from this month's data)");
  L.push(`- **Indices:** strongest YTD is ${instr.best.name} ${fmtPct(instr.best.chg.YTD)}; weakest is ${instr.worst.name} ${fmtPct(instr.worst.chg.YTD)}.`);
  L.push(`- **Sectors:** ${secPos} of ${secs.length} positive YTD — leader ${secX.best.name} ${fmtPct(secX.best.chg.YTD)}, laggard ${secX.worst.name} ${fmtPct(secX.worst.chg.YTD)}.`);
  if (vix && cpi && unemp && fed) {
    L.push(`- **Macro tone:** VIX ${vix.val} (${vix.flag}), CPI ${cpi.val} (${cpi.flag}), unemployment ${unemp.val}, Fed funds ${fed.val} (${fed.flag}).`);
  }
  L.push(`- **Funds:** best YTD ${funds.best.short} ${fmtPct(funds.best.ytd)}; softest ${funds.worst.short} ${fmtPct(funds.worst.ytd)}.`);
  L.push("");
  L.push("### 🩺 Data health");
  L.push(`- Last data refresh: **${data.meta.weekOf}**${age != null ? ` (${age} day${age === 1 ? "" : "s"} ago)` : ""}, mode \`${genBy}\`.`);
  L.push(`- Live sources last run: ${sources.length ? sources.join(", ") : "_none — ran on the weekly-drift fallback_"}.`);
  if (age != null && age > 10) L.push(`- ⚠️ Data looks stale (>10 days). Check that the weekly workflow is running.`);
  if (!fredLive) L.push(`- ⚠️ Macro not live — add a \`FRED_API_KEY\` secret to pull CPI/VIX/unemployment/Fed funds from source (backlog item below).`);
  if (fundsIllustrative) L.push(`- ⚠️ Fund figures are illustrative — wiring live AIA prices is the top backlog item.`);
  L.push("");
  L.push("### ✅ Suggested additions this month");
  rotating.forEach((item, i) => L.push(`${i + 1}. ${item}`));
  L.push("");
  L.push("### 🗂️ Full backlog");
  L.push("<details><summary>All tracked enhancement ideas</summary>");
  L.push("");
  BACKLOG.forEach((item, i) => L.push(`- ${item}`));
  L.push("");
  L.push("</details>");
  L.push("");
  L.push("---");
  L.push("");

  return { title: `Monthly Hub review — ${month} ${year}`, body: L.join("\n") };
}

function main() {
  const data = JSON.parse(readFileSync(DATA, "utf8"));
  const now = new Date();
  const { title, body } = buildReview(data, now);

  // Prepend to the roadmap doc (newest first).
  const header =
    "# Market & Planning Hub — Monthly Review\n\n" +
    "An automated monthly look at how the Hub is doing and what to add next. " +
    "Newest review at the top. Generated by `scripts/monthly-review.mjs`.\n\n";
  let existing = "";
  if (existsSync(DOC)) {
    existing = readFileSync(DOC, "utf8");
    // strip the fixed header if present so we can re-add it on top
    existing = existing.replace(/^# Market & Planning Hub — Monthly Review[\s\S]*?\n\n(?=## )/, "");
  }
  mkdirSync(path.dirname(DOC), { recursive: true });
  writeFileSync(DOC, header + body + "\n" + existing);
  console.log(`Wrote review "${title}" to ${DOC}`);

  // Optionally emit the body for the workflow to open an issue with.
  const out = process.env.REVIEW_BODY_OUT;
  if (out) {
    writeFileSync(out, body);
    console.log(`Wrote issue body to ${out}`);
  }
  // Emit the title for the workflow (GitHub Actions output).
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `title=${title}\n`, { flag: "a" });
  }
}

main();
