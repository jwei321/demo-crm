#!/usr/bin/env node
/**
 * Weekly market-data refresh for the Market & Planning Hub.
 *
 * Runs in CI every Monday (see .github/workflows/weekly-market-update.yml).
 * It rewrites data/market.json:
 *   - Instruments (indices / FX / commodities): live from Stooq history CSV.
 *   - S&P sectors: live from sector-ETF proxies on Stooq.
 *   - Macro readings: live from FRED (only if FRED_API_KEY is set).
 *   - Funds (AIA ILP, illustrative): deterministic weekly drift.
 *   - Anything a live source can't fill: deterministic weekly drift so the page
 *     still visibly updates every week.
 *   - meta.stamp / updatedISO / weekOf / generatedBy / sources.
 *
 * No non-builtin dependencies — uses global fetch (Node >= 18).
 * Every network call is wrapped so one failure never aborts the run.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "data", "market.json");
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/* ---------- tiny seeded RNG for deterministic weekly drift ---------- */
function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// deterministic value in [-1,1] for a (weekKey, field) pair
function drift(weekKey, field) {
  return mulberry32(strHash(weekKey + "::" + field))() * 2 - 1;
}

/* ---------- date helpers (SGT week) ---------- */
function mondayOf(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = Monday
  x.setUTCDate(x.getUTCDate() - dow);
  return x;
}

/* ---------- number formatting that preserves the existing style ---------- */
function decimalsOf(str) {
  const m = String(str).match(/\.(\d+)/);
  return m ? m[1].length : 0;
}
function formatLike(sample, value) {
  const d = decimalsOf(sample);
  const pct = String(sample).includes("%");
  const out = value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return pct ? out + "%" : out;
}
function round1(v) {
  return Math.round(v * 10) / 10;
}

/* ---------- Stooq daily history: returns [{date:Date, close:number}] asc ---------- */
async function stooqDaily(symbol) {
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const res = await fetch(url, { headers: { "User-Agent": "market-hub-updater" } });
  if (!res.ok) throw new Error(`stooq ${symbol} HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  if (lines.length < 10 || !/^Date,/i.test(lines[0])) throw new Error(`stooq ${symbol} no data`);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    const close = parseFloat(parts[4]);
    if (parts[0] && Number.isFinite(close)) rows.push({ date: new Date(parts[0]), close });
  }
  return rows;
}

/* ---------- Yahoo Finance chart (fallback, no key) ---------- */
async function yahooDaily(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=2y&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 market-hub-updater" } });
  if (!res.ok) throw new Error(`yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp;
  const closes = r?.indicators?.quote?.[0]?.close;
  if (!ts || !closes) throw new Error(`yahoo ${symbol} no data`);
  const rows = [];
  for (let i = 0; i < ts.length; i++) {
    if (Number.isFinite(closes[i])) rows.push({ date: new Date(ts[i] * 1000), close: closes[i] });
  }
  if (rows.length < 10) throw new Error(`yahoo ${symbol} thin data`);
  return rows;
}

// Try Stooq first, then Yahoo. Returns { rows, source } or throws.
async function fetchHistory(stooqSym, yahooSym) {
  const errs = [];
  if (stooqSym) {
    try {
      return { rows: await stooqDaily(stooqSym), source: "Stooq" };
    } catch (e) {
      errs.push(e.message);
    }
  }
  if (yahooSym) {
    try {
      return { rows: await yahooDaily(yahooSym), source: "Yahoo Finance" };
    } catch (e) {
      errs.push(e.message);
    }
  }
  throw new Error(errs.join(" | ") || "no symbol");
}

// % return over `k` trading rows back; null if not enough history
function pctBack(rows, k) {
  const n = rows.length;
  if (n <= k) return null;
  const a = rows[n - 1].close;
  const b = rows[n - 1 - k].close;
  if (!b) return null;
  return ((a - b) / b) * 100;
}
function pctYTD(rows) {
  if (!rows.length) return null;
  const year = rows[rows.length - 1].date.getUTCFullYear();
  let prevEnd = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].date.getUTCFullYear() < year) {
      prevEnd = rows[i].close;
      break;
    }
  }
  if (!prevEnd) return null;
  return ((rows[rows.length - 1].close - prevEnd) / prevEnd) * 100;
}

/* ---------- FRED helpers (optional) ---------- */
async function fredSeries(id, key) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&sort_order=asc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fred ${id} HTTP ${res.status}`);
  const json = await res.json();
  return (json.observations || [])
    .map((o) => ({ date: o.date, v: parseFloat(o.value) }))
    .filter((o) => Number.isFinite(o.v));
}

/* ---------- symbol maps ---------- */
// [stooqSymbol, yahooSymbol]
const INSTR_SYMBOLS = {
  spx: ["^spx", "^GSPC"],
  ndx: ["^ndx", "^NDX"],
  sti: ["^sti", "^STI"],
  nky: ["^nkx", "^N225"],
  us10: ["10usy.b", "^TNX"],
  sgd: ["usdsgd", "SGD=X"],
  gold: ["xauusd", "GC=F"],
  brent: ["cb.f", "BZ=F"],
};
const SECTOR_ETF = {
  tech: ["xlk.us", "XLK"],
  fin: ["xlf.us", "XLF"],
  health: ["xlv.us", "XLV"],
  consd: ["xly.us", "XLY"],
  comms: ["xlc.us", "XLC"],
  indu: ["xli.us", "XLI"],
  staples: ["xlp.us", "XLP"],
  energy: ["xle.us", "XLE"],
  util: ["xlu.us", "XLU"],
  reit: ["xlre.us", "XLRE"],
  mat: ["xlb.us", "XLB"],
};

async function main() {
  const data = JSON.parse(readFileSync(FILE, "utf8"));
  const now = new Date();
  const monday = mondayOf(now);
  const weekKey = monday.toISOString().slice(0, 10);
  const sources = new Set();
  let anyLive = false;

  /* ---------- instruments ---------- */
  for (const inst of data.instruments) {
    const syms = INSTR_SYMBOLS[inst.id];
    let live = false;
    if (syms) {
      try {
        const { rows, source } = await fetchHistory(syms[0], syms[1]);
        const last = rows[rows.length - 1].close;
        inst.val = formatLike(inst.val, last);
        const map = { "1W": pctBack(rows, 5), "1M": pctBack(rows, 21), "3M": pctBack(rows, 63), YTD: pctYTD(rows), "1Y": pctBack(rows, 252) };
        for (const tf of Object.keys(inst.chg)) {
          if (map[tf] != null) inst.chg[tf] = round1(map[tf]);
        }
        // refresh the sparkline shape from the last 12 weekly-ish closes
        const step = Math.max(1, Math.floor(rows.length / 12));
        const spark = [];
        for (let i = Math.max(0, rows.length - step * 12); i < rows.length; i += step) spark.push(rows[i].close);
        if (spark.length >= 6) inst.data = spark.slice(-12);
        live = true;
        anyLive = true;
        sources.add(`${source} (markets)`);
      } catch (e) {
        console.warn(`[instr] ${inst.id}: ${e.message}`);
      }
    }
    if (!live) driftInstrument(inst, weekKey);
  }

  /* ---------- sectors ---------- */
  for (const sec of data.sectors) {
    const syms = SECTOR_ETF[sec.id];
    let live = false;
    if (syms) {
      try {
        const { rows, source } = await fetchHistory(syms[0], syms[1]);
        const map = { "1W": pctBack(rows, 5), "1M": pctBack(rows, 21), "3M": pctBack(rows, 63), YTD: pctYTD(rows), "1Y": pctBack(rows, 252) };
        for (const tf of ["1W", "1M", "3M", "YTD", "1Y"]) {
          if (map[tf] != null) sec.chg[tf] = round1(map[tf]);
        }
        live = true;
        anyLive = true;
        sources.add(`${source} (sector ETFs)`);
      } catch (e) {
        console.warn(`[sector] ${sec.id}: ${e.message}`);
      }
    }
    // long-horizon buckets are illustrative — always give a gentle weekly nudge
    for (const tf of live ? ["5Y", "10Y", "MAX"] : ["1W", "1M", "3M", "YTD", "1Y", "5Y", "10Y", "MAX"]) {
      sec.chg[tf] = round1(sec.chg[tf] * (1 + drift(weekKey, "sec:" + sec.id + tf) * 0.02));
    }
  }

  /* ---------- macro (FRED, optional) ---------- */
  const fredKey = process.env.FRED_API_KEY;
  if (fredKey) {
    await updateMacroFromFred(data.macro, fredKey, sources).catch((e) => console.warn(`[macro] ${e.message}`));
    anyLive = true;
  } else {
    console.warn("[macro] FRED_API_KEY not set — applying weekly drift only");
    for (const m of data.macro) driftMacro(m, weekKey);
  }

  /* ---------- funds (illustrative — weekly drift) ---------- */
  for (const f of data.funds) driftFund(f, weekKey);

  /* ---------- meta ---------- */
  const dd = String(monday.getUTCDate()).padStart(2, "0");
  data.meta.updatedISO = now.toISOString();
  data.meta.weekOf = weekKey;
  data.meta.stamp = `UPDATED ${dd} ${MONTHS[monday.getUTCMonth()]} ${monday.getUTCFullYear()} · 09:30 SGT`;
  data.meta.generatedBy = anyLive ? "live" : "fallback";
  data.meta.sources = [...sources];

  writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`Updated ${FILE} — week ${weekKey}, generatedBy=${data.meta.generatedBy}, sources=[${[...sources].join(", ")}]`);
}

/* ---------- drift fallbacks ---------- */
function driftInstrument(inst, weekKey) {
  const wk = drift(weekKey, "instr:" + inst.id + ":1W");
  for (const tf of Object.keys(inst.chg)) {
    inst.chg[tf] = round1(inst.chg[tf] + drift(weekKey, "instr:" + inst.id + tf) * 0.6);
  }
  // nudge the displayed value in line with the 1W move
  const num = parseFloat(String(inst.val).replace(/[^0-9.\-]/g, ""));
  if (Number.isFinite(num)) inst.val = formatLike(inst.val, num * (1 + (inst.chg["1W"] / 100 - wk * 0.001)));
}
function driftMacro(m, weekKey) {
  // nudge the change column and the sparkline tail; leave the headline value text
  m.chg = Math.round((m.chg + drift(weekKey, "macro:" + m.name) * 0.1) * 100) / 100;
  m.spark = m.spark.map((v, i) => Math.max(1, Math.round(v + drift(weekKey, "macro:" + m.name + ":" + i) * 1.5)));
}
function driftFund(f, weekKey) {
  const s = drift(weekKey, "fund:" + f.short) * 0.8; // shared weekly move for the fund
  f.ytd = round1(f.ytd + s);
  const num = parseFloat(String(f.nav).replace(/[^0-9.]/g, ""));
  const dec = decimalsOf(f.nav);
  if (Number.isFinite(num)) f.nav = "S$" + (num * (1 + s / 100)).toFixed(dec);
  f.returns = f.returns.map(([label, v], i) => [label, round1(v + drift(weekKey, "fund:" + f.short + ":" + i) * 0.5)]);
}

/* ---------- macro via FRED ---------- */
async function updateMacroFromFred(macro, key, sources) {
  const get = (name) => macro.find((m) => m.name === name);
  const yoy = (obs) => {
    if (obs.length < 13) return null;
    const a = obs[obs.length - 1].v;
    const b = obs[obs.length - 13].v;
    return ((a - b) / b) * 100;
  };
  const setVal = (m, txt, chg, spark) => {
    if (!m) return;
    m.val = txt;
    if (chg != null) {
      m.chg = Math.round(chg * 10) / 10;
      m.chgTxt = (chg >= 0 ? "▲ " : "▼ ") + Math.abs(Math.round(chg * 10) / 10) + "pp vs prior";
    }
    if (spark) m.spark = spark.slice(-12).map((v) => Math.round(v));
  };

  try {
    const cpi = await fredSeries("CPIAUCSL", key);
    const y = yoy(cpi);
    const prev = ((cpi[cpi.length - 2].v - cpi[cpi.length - 14].v) / cpi[cpi.length - 14].v) * 100;
    const sp = [];
    for (let i = cpi.length - 12; i < cpi.length; i++) if (i >= 13) sp.push(((cpi[i].v - cpi[i - 12].v) / cpi[i - 12].v) * 100 * 10);
    setVal(get("CPI (YOY)"), y.toFixed(1) + "%", y - prev, sp.length ? sp : null);
    sources.add("FRED (macro)");
  } catch (e) {
    console.warn(`[macro] CPI: ${e.message}`);
  }
  try {
    const core = await fredSeries("CPILFESL", key);
    const y = yoy(core);
    const prev = ((core[core.length - 2].v - core[core.length - 14].v) / core[core.length - 14].v) * 100;
    setVal(get("CORE CPI (YOY)"), y.toFixed(1) + "%", y - prev, null);
    sources.add("FRED (macro)");
  } catch (e) {
    console.warn(`[macro] CORE CPI: ${e.message}`);
  }
  try {
    const u = await fredSeries("UNRATE", key);
    const last = u[u.length - 1].v;
    const prev = u[u.length - 2].v;
    setVal(get("UNEMPLOYMENT"), last.toFixed(1) + "%", last - prev, u.map((o) => o.v).slice(-12).map((v) => v * 10));
    const m = get("UNEMPLOYMENT");
    if (m) m.good = last - prev <= 0;
    sources.add("FRED (macro)");
  } catch (e) {
    console.warn(`[macro] UNRATE: ${e.message}`);
  }
  try {
    const vix = await fredSeries("VIXCLS", key);
    const last = vix[vix.length - 1].v;
    const prevw = vix.length > 6 ? vix[vix.length - 6].v : vix[vix.length - 2].v;
    const m = get("VIX");
    if (m) {
      m.val = last.toFixed(1);
      m.chg = Math.round((last - prevw) * 10) / 10;
      m.chgTxt = (m.chg >= 0 ? "▲ " : "▼ ") + Math.abs(m.chg) + " this week";
      m.flag = last < 15 ? "CALM" : last < 22 ? "NORMAL" : "STRESSED";
      m.good = last < 20;
      m.spark = vix.map((o) => o.v).slice(-12).map((v) => Math.round(v));
    }
    sources.add("FRED (macro)");
  } catch (e) {
    console.warn(`[macro] VIX: ${e.message}`);
  }
  try {
    const lo = await fredSeries("DFEDTARL", key);
    const hi = await fredSeries("DFEDTARU", key);
    const m = get("FED FUNDS");
    if (m) m.val = `${lo[lo.length - 1].v.toFixed(2)}–${hi[hi.length - 1].v.toFixed(2)}%`;
    sources.add("FRED (macro)");
  } catch (e) {
    console.warn(`[macro] FED FUNDS: ${e.message}`);
  }
}

main().catch((e) => {
  console.error("update-market-data failed:", e);
  process.exit(1);
});
