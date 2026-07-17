"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MarketData, Instrument, Sector, Fund } from "@/lib/market/types";
import {
  SECTOR_INFO,
  MACRO_NEXT,
  MACRO_SOURCES,
  COMPANIES,
  HORIZONS,
  QUIZ,
  PROFILES,
  AIA_FUND_URL,
} from "@/lib/market/static";

/* ---------- palette ---------- */
const GREEN = "#3EE68F";
const RED = "#FF6A6A";
const GOLD = "#F5C558";
const ORANGE = "#FF8A3C";
const MUTED = "#6B7494";
const SECON = "#8A94B8";

/* ---------- pure helpers (ported from the design spec) ---------- */
function hash(s: string): number {
  let h = 0;
  for (const ch of s.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}
function rnd(h: number, i: number, lo: number, hi: number): number {
  const x = Math.abs(Math.sin(h * 0.0001 + i * 7.3)) % 1;
  return lo + x * (hi - lo);
}
function sparkPath(vals: number[], w: number, h: number): string {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rng = max - min || 1;
  return vals
    .map(
      (v, i) =>
        (i ? "L" : "M") +
        (i * (w / (vals.length - 1))).toFixed(1) +
        "," +
        (h - 2 - ((v - min) / rng) * (h - 4)).toFixed(1)
    )
    .join(" ");
}
function fmtSGD(v: number): string {
  return "S$" + Math.round(v ?? 0).toLocaleString("en-SG");
}
const sgn = (v: number, sfx = "%") => (v >= 0 ? "+" : "") + v.toFixed(1) + sfx;
const mono = "var(--font-plex-mono), 'IBM Plex Mono', monospace";

/* ---------- reduced-motion + eased number animation ---------- */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

type NumMap = Record<string, number>;
function useEased(targets: NumMap): NumMap {
  const reduced = usePrefersReducedMotion();
  const [disp, setDisp] = useState<NumMap>(targets);
  const dispRef = useRef<NumMap>(targets);
  const raf = useRef<number>(0);
  useEffect(() => {
    dispRef.current = disp;
  });
  const key = JSON.stringify(targets);
  useEffect(() => {
    if (reduced) {
      setDisp(targets);
      dispRef.current = targets;
      return;
    }
    const from = { ...dispRef.current };
    const t0 = performance.now();
    const keys = Object.keys(targets);
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 550);
      const e = 1 - Math.pow(1 - p, 3);
      const next: NumMap = {};
      for (const k of keys) {
        const f = from[k] ?? targets[k] * 0.5;
        next[k] = f + (targets[k] - f) * e;
      }
      setDisp(next);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);
  return disp;
}

/* ---------- shared style atoms ---------- */
const divider = "1px solid rgba(255,255,255,.07)";
const panel: CSSProperties = {
  background: "rgba(255,255,255,.025)",
  border: "1px solid rgba(255,255,255,.08)",
};

type TF = "1W" | "1M" | "3M" | "YTD" | "1Y";
const TFS: TF[] = ["1W", "1M", "3M", "YTD", "1Y"];
const SEC_TFS = ["1W", "1M", "3M", "YTD", "1Y", "5Y", "10Y", "MAX"] as const;

export default function MarketHub({ data }: { data: MarketData }) {
  const INSTR = data.instruments;
  const SECTORS = data.sectors;
  const MACRO = data.macro;
  const FUNDS = data.funds;
  const FUND_FACTS = data.fundFacts;

  /* ---------- state ---------- */
  const [tf, setTf] = useState<TF>("YTD");
  const [secTf, setSecTf] = useState<(typeof SEC_TFS)[number]>("YTD");
  const [horizon, setHorizon] = useState(0);
  const [sel, setSel] = useState(INSTR[0]?.id ?? "spx");
  const [hoverSec, setHoverSec] = useState(SECTORS[0]?.id ?? "tech");
  const [query, setQuery] = useState("");
  const [co, setCo] = useState("NVIDIA");
  const [fund, setFund] = useState(0);
  const [g, setG] = useState({ init: 25000, monthly: 500, ret: 6, yrs: 20 });
  const [inf, setInf] = useState({ amt: 100000, rate: 2.5, yrs: 20 });
  const [r, setR] = useState({ age: 35, retAge: 62, income: 4000, savings: 150000 });
  const [r72, setR72] = useState(6);
  const [quiz, setQuiz] = useState({ i: 0, score: 0, done: false });

  /* ---------- planning maths ---------- */
  const calc = useMemo(() => {
    const m = g.ret / 1200;
    const n = g.yrs * 12;
    const fv =
      m > 0
        ? g.init * Math.pow(1 + m, n) + g.monthly * ((Math.pow(1 + m, n) - 1) / m)
        : g.init + g.monthly * n;
    const contrib = g.init + g.monthly * n;
    const real = inf.amt / Math.pow(1 + inf.rate / 100, inf.yrs);
    const yrsTo = Math.max(0, r.retAge - r.age);
    const pot = r.savings * Math.pow(1.05, yrsTo);
    const need = r.income * 12 * 25;
    return { fv, contrib, growth: fv - contrib, real, pot, need, gap: pot - need, dbl: 72 / r72 };
  }, [g, inf, r, r72]);

  const disp = useEased({
    fv: calc.fv,
    contrib: calc.contrib,
    growth: calc.growth,
    real: calc.real,
    pot: calc.pot,
    need: calc.need,
    gap: calc.gap,
    dbl: calc.dbl,
  });

  /* keep age < retAge coupled like the spec */
  const setRField = (field: keyof typeof r) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value;
    setR((s) => {
      const g2 = { ...s, [field]: v };
      if (g2.retAge <= g2.age) {
        if (field === "age") g2.retAge = Math.min(70, g2.age + 1);
        else g2.age = Math.max(20, g2.retAge - 1);
      }
      return g2;
    });
  };

  const selInstr = INSTR.find((i) => i.id === sel) ?? INSTR[0];
  const chgOf = (i: Instrument) => i.chg[tf];

  /* ---------- candlestick series ---------- */
  const candleView = useMemo(() => {
    const d = selInstr.data;
    const NC = 26;
    const cw = 620 / NC;
    const seed = tf.length + sel.length;
    const rawC: { open: number; close: number; hi: number; lo: number }[] = [];
    let prevClose = 50;
    for (let t = 0; t < NC; t++) {
      const f = (t / (NC - 1)) * (d.length - 1);
      const i0 = Math.floor(f);
      const fr = f - i0;
      const close =
        d[i0] + (d[Math.min(i0 + 1, d.length - 1)] - d[i0]) * fr + Math.sin(t * 2.1 + seed) * 1.8;
      const open = prevClose;
      const hi = Math.max(open, close) + 0.8 + Math.abs(Math.sin(t * 3.3 + seed)) * 1.4;
      const lo = Math.min(open, close) - 0.8 - Math.abs(Math.cos(t * 2.7 + seed)) * 1.4;
      prevClose = close;
      rawC.push({ open, close, hi, lo });
    }
    const cLo = Math.min(...rawC.map((c) => c.lo));
    const cHi = Math.max(...rawC.map((c) => c.hi));
    const cRng = cHi - cLo || 1;
    const cy = (v: number) => 288 - ((v - cLo) / cRng) * 276;
    const candles = rawC.map((c, t) => {
      const up = c.close >= c.open;
      const top = cy(Math.max(c.open, c.close));
      const bot = cy(Math.min(c.open, c.close));
      return {
        cx: (t * cw + cw / 2).toFixed(1),
        x: (t * cw + cw * 0.22).toFixed(1),
        w: (cw * 0.56).toFixed(1),
        wy1: cy(c.hi).toFixed(1),
        wy2: cy(c.lo).toFixed(1),
        by: top.toFixed(1),
        bh: Math.max(bot - top, 1.5).toFixed(1),
        color: up ? GREEN : RED,
      };
    });
    const lastC = rawC[rawC.length - 1].close;
    const pos = Math.max(0, Math.min(1, (lastC - cLo) / cRng));
    return { candles, pos };
  }, [selInstr, tf, sel]);

  /* ---------- asset ladder ---------- */
  const ladder = useMemo(() => {
    const maxAbs = Math.max(...INSTR.map((i) => Math.abs(chgOf(i))), 0.1);
    return [...INSTR]
      .sort((a, b) => chgOf(b) - chgOf(a))
      .map((i) => {
        const c = chgOf(i);
        const w = (Math.abs(c) / maxAbs) * 48;
        const isSel = i.id === sel;
        return {
          id: i.id,
          name: i.name,
          chgTxt: (c >= 0 ? "+" : "") + c.toFixed(1) + "%",
          chgColor: c >= 0 ? GREEN : RED,
          barLeft: c >= 0 ? "50%" : 50 - w + "%",
          barW: w + "%",
          barBg: isSel ? GOLD : c >= 0 ? GREEN : RED,
          barGlow: (isSel ? GOLD : c >= 0 ? GREEN : RED) + "66",
          rowBg: isSel ? "rgba(245,197,88,.07)" : "rgba(255,255,255,.02)",
          rowBorder: isSel ? "rgba(245,197,88,.45)" : "rgba(255,255,255,.07)",
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [INSTR, tf, sel]);

  /* ---------- sector orbs ---------- */
  const SC1 = ["#8FF0C2", "#25B577"];
  const SC2 = ["#FFA3A3", "#FF5A5A"];
  const orbs = useMemo(
    () =>
      SECTORS.map((s, i) => {
        const c = s.chg[secTf];
        const up = c >= 0;
        const size = Math.round(34 + Math.sqrt(s.w) * 23);
        const [c2, c1] = up ? SC1 : SC2;
        const glowA = 0.3 + (Math.min(Math.abs(c), 12) / 12) * 0.45;
        const isSel = hoverSec === s.id;
        return {
          id: s.id,
          left: s.x + "%",
          top: s.y + "%",
          size,
          ml: -(size / 2) + "px",
          fs: Math.max(8, size / 10) + "px",
          fs2: Math.max(9, size / 8.5) + "px",
          bg: `radial-gradient(circle at 34% 30%, ${c2}, ${c1} 55%, rgba(10,14,26,.6) 97%)`,
          glow: `0 0 ${Math.round(size / 3)}px ${c1}${Math.round(glowA * 255)
            .toString(16)
            .padStart(2, "0")}, 0 0 ${Math.round(size * 0.8)}px ${c1}38`,
          border: isSel ? GOLD : "transparent",
          anim: `mh-drift${(i % 3) + 1} ${8 + i * 1.1}s ease-in-out infinite`,
          label: s.label,
          chgTxt: (up ? "+" : "") + (Math.abs(c) >= 100 ? c.toFixed(0) : c.toFixed(1)) + "%",
        };
      }),
    [SECTORS, secTf, hoverSec]
  );
  const secSel: Sector = SECTORS.find((s) => s.id === hoverSec) ?? SECTORS[0];
  const secChg = secSel.chg[secTf];

  /* ---------- macro cards ---------- */
  const macro = MACRO.map((m) => ({
    name: m.name,
    val: m.val,
    chgTxt: m.chgTxt,
    note: m.note,
    flag: m.flag,
    src: "SOURCE: " + (MACRO_SOURCES[m.name]?.[0] ?? "—"),
    href: MACRO_SOURCES[m.name]?.[1] ?? "#",
    next: MACRO_NEXT[m.name] ?? "",
    chgColor: m.good ? GREEN : ORANGE,
    flagColor: m.good ? GREEN : ORANGE,
    flagBorder: (m.good ? GREEN : ORANGE) + "55",
    spark: sparkPath(m.spark, 100, 28),
    sparkColor: m.good ? "#2EE6C8" : ORANGE,
  }));

  /* ---------- company analyzer ---------- */
  const company = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches =
      q.length > 0
        ? COMPANIES.filter(([n, t]) => n.toLowerCase().includes(q) || t.toLowerCase().includes(q)).slice(0, 5)
        : [];
    const known = COMPANIES.find(([n]) => n === co);
    const name = co;
    const ticker = known ? known[1] : name.slice(0, 4).toUpperCase();
    const h = hash(name);
    const R = (i: number, lo: number, hi: number) => rnd(h, i, lo, hi);
    const chg = R(1, -3, 14);
    const revC = R(2, -5, 25);
    const epsC = R(3, -8, 30);
    const revenue = R(4, 2, 400);
    const eps = R(5, 0.5, 12);
    const scores = [R(6, 0.45, 0.95), R(7, 0.35, 0.9), R(8, 0.3, 0.92), R(9, 0.35, 0.88), R(10, 0.25, 0.85), R(11, 0.2, 0.8)];
    const avg = scores.reduce((a, b) => a + b) / 6;
    const volI = Math.round(R(12, 20, 80));
    const volH = Math.round(R(13, 15, 45));
    const volR = Math.round(R(14, 25, 60));
    const CX = 150;
    const CY = 115;
    const RAD = 88;
    const pt = (i: number, f: number): [string, string] => {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      return [(CX + Math.cos(a) * RAD * f).toFixed(1), (CY + Math.sin(a) * RAD * f).toFixed(1)];
    };
    const ring = (f: number) => [0, 1, 2, 3, 4, 5].map((i) => pt(i, f).join(",")).join(" ");
    const sparkGen = (off: number) => {
      const pts: number[] = [];
      for (let i = 0; i < 12; i++) pts.push(R(20 + off + i, 8, 30) + i * R(19 + off, 0, 1.2));
      const mn = Math.min(...pts);
      const mx = Math.max(...pts);
      const rg = mx - mn || 1;
      const xy = pts.map((v, i) => [(i * (100 / 11)).toFixed(1), (32 - ((v - mn) / rg) * 28).toFixed(1)]);
      return {
        line: xy.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" "),
        area: "0,34 " + xy.map((p) => p[0] + "," + p[1]).join(" ") + " 100,34",
      };
    };
    const s1 = sparkGen(0);
    const s2 = sparkGen(40);
    const surfXY: [string, string][] = [];
    for (let i = 0; i <= 20; i++) {
      const x = i / 20;
      surfXY.push([(x * 380).toFixed(1), (14 + Math.pow(x - R(15, 0.3, 0.7), 2) * 130 + R(16, 0, 12)).toFixed(1)]);
    }
    const fmtB = (v: number) => "$" + v.toFixed(v >= 10 ? 1 : 2) + "B";
    return {
      matches,
      name,
      ticker,
      chgTxt: sgn(chg) + " YTD",
      chgColor: chg >= 0 ? GREEN : RED,
      revenue: fmtB(revenue),
      revChg: sgn(revC),
      revChgColor: revC >= 0 ? GREEN : RED,
      eps: "$" + eps.toFixed(2),
      epsChg: sgn(epsC),
      epsChgColor: epsC >= 0 ? GREEN : RED,
      spark1: s1.line,
      spark1Area: s1.area,
      spark2: s2.line,
      spark2Area: s2.area,
      hexGrid1: ring(1),
      hexGrid2: ring(0.66),
      hexGrid3: ring(0.33),
      spokes: [0, 1, 2, 3, 4, 5].map((i) => {
        const [x, y] = pt(i, 1);
        return { x, y };
      }),
      radarPts: scores.map((s, i) => pt(i, s).join(",")).join(" "),
      radarPts2: ring(0.6),
      healthLabel: avg > 0.7 ? "Strong" : avg > 0.5 ? "Stable" : "Weak",
      healthColor: avg > 0.7 ? GREEN : avg > 0.5 ? GOLD : RED,
      volFlag: volI > 55 ? "⚠ Elevated" : "Normal",
      volFlagColor: volI > 55 ? ORANGE : GREEN,
      volBars: [
        { name: "Historical (30d)", pct: volH, w: volH + "%", color: "#2EE6C8" },
        { name: "Implied (ATM)", pct: volI, w: volI + "%", color: ORANGE },
        { name: "Realised", pct: volR, w: volR + "%", color: "#4D9FFF" },
      ],
      volSurf: surfXY.map((p, i) => (i ? "L" : "M") + p[0] + "," + p[1]).join(" "),
      volSurfArea: "0,70 " + surfXY.map((p) => p[0] + "," + p[1]).join(" ") + " 380,70",
      metrics: [
        { name: "Market Cap", val: "$" + R(23, 40, 3200).toFixed(0) + "B", color: "#fff" },
        { name: "Market Share", val: sgn(R(17, 2, 25)), color: GREEN },
        { name: "P/E Ratio", val: R(18, 8, 60).toFixed(1), color: "#fff" },
        { name: "Gross Margin", val: R(24, 22, 76).toFixed(0) + "%", color: "#fff" },
        { name: "ROE", val: R(25, 5, 45).toFixed(1) + "%", color: "#fff" },
        { name: "Debt / Equity", val: R(26, 0.1, 1.8).toFixed(2), color: "#fff" },
        { name: "Dividend Yield", val: R(21, 0, 5).toFixed(2) + "%", color: "#fff" },
        { name: "Beta", val: R(22, 0.5, 2.2).toFixed(2), color: "#fff" },
      ],
    };
  }, [query, co]);

  /* ---------- fund analyzer ---------- */
  const F: Fund = FUNDS[fund];
  const fundView = useMemo(() => {
    const DC = 2 * Math.PI * 54;
    let acc = 0;
    const fSegs = F.alloc.map(([, pct, col]) => {
      const len = (pct / 100) * DC;
      const off = (-acc / 100) * DC;
      acc += pct;
      return { color: col, da: len.toFixed(1) + " " + (DC - len).toFixed(1), off: off.toFixed(1) };
    });
    const maxH = F.holdings[0][1];
    const maxG = F.geo[0][1];
    return {
      fSegs,
      fLegend: F.alloc.map(([n, pct, col]) => ({ name: n, pct, color: col })),
      fHoldings: F.holdings.map(([n, p]) => ({ name: n, pct: p.toFixed(1) + "%", w: ((p / maxH) * 100).toFixed(0) + "%" })),
      fGeo: F.geo.map(([n, p]) => ({ name: n, pct: p + "%", w: ((p / maxG) * 100).toFixed(0) + "%" })),
      fReturns: F.returns.map(([n, v]) => ({ name: n, val: sgn(v), color: v >= 0 ? GREEN : RED })),
      fFacts: ["INCEPTION", "BENCHMARK", "ANNUAL FEE", "VOLATILITY (3Y)", "SHARPE (3Y)", "MAX DRAWDOWN"].map(
        (n, i) => ({ name: n, val: (FUND_FACTS[F.short] ?? ["—", "—", "—", "—", "—", "—"])[i] })
      ),
    };
  }, [F, FUND_FACTS]);
  const riskColor = (lvl: number) => (lvl === 2 ? ORANGE : lvl === 1 ? GOLD : GREEN);

  /* ---------- outlook ---------- */
  const H = HORIZONS[horizon];

  /* ---------- growth chart geometry ---------- */
  const growthGeom = useMemo(() => {
    const yrPts: { total: number; contrib: number }[] = [];
    for (let y = 0; y <= g.yrs; y++) {
      const mm = g.ret / 1200;
      const nn = y * 12;
      const fvY =
        mm > 0
          ? g.init * Math.pow(1 + mm, nn) + g.monthly * ((Math.pow(1 + mm, nn) - 1) / mm)
          : g.init + g.monthly * nn;
      yrPts.push({ total: fvY, contrib: g.init + g.monthly * nn });
    }
    const maxV = Math.max(calc.fv, 1);
    const px = (y: number) => ((y / g.yrs) * 600).toFixed(1);
    const py = (v: number) => (212 - (v / maxV) * 195).toFixed(1);
    const totalXY = yrPts.map((p, y) => px(y) + "," + py(p.total));
    const contribXY = yrPts.map((p, y) => px(y) + "," + py(p.contrib));
    return {
      gTotalArea: "0,212 " + totalXY.join(" ") + " 600,212",
      gTotalLine: totalXY.map((p, i) => (i ? "L" : "M") + p).join(" "),
      gContribArea: "0,212 " + contribXY.join(" ") + " 600,212",
      gContribLine: contribXY.map((p, i) => (i ? "L" : "M") + p).join(" "),
    };
  }, [g, calc.fv]);

  /* ---------- retirement + inflation + quiz derived ---------- */
  const CIRC = 389.6;
  const ratio = Math.min(calc.pot / calc.need, 1);
  const gapPos = calc.gap >= 0;
  const infOrbPx = Math.round(120 * Math.sqrt(Math.max(calc.real / inf.amt, 0.02)));

  const prof = PROFILES.find((p) => quiz.score <= p.max) ?? PROFILES[PROFILES.length - 1];
  const quizSegs = useMemo(() => {
    const DCIRC = 2 * Math.PI * 54;
    let acc = 0;
    return prof.alloc.map(([, pct, col]) => {
      const len = (pct / 100) * DCIRC;
      const off = (-acc / 100) * DCIRC;
      acc += pct;
      return { color: col, da: len.toFixed(1) + " " + (DCIRC - len).toFixed(1), off: off.toFixed(1) };
    });
  }, [prof]);
  const pickQuiz = (score: number) =>
    setQuiz((s) => ({ i: s.i + 1, score: s.score + score, done: s.i + 1 >= 6 }));

  const tape = INSTR.map((i) => {
    const c = chgOf(i);
    return {
      name: i.name,
      val: i.val,
      chgTxt: (c >= 0 ? "+" : "") + c.toFixed(2) + "%",
      chgColor: c >= 0 ? GREEN : RED,
    };
  });
  const tape2x = [...tape, ...tape];

  const y1 = selInstr.chg["1Y"];
  const ytd = selInstr.chg["YTD"];

  /* ---------- render ---------- */
  return (
    <div
      style={{
        background: "#0A0E1A",
        color: "#E8ECF6",
        fontFamily: "var(--font-instrument), 'Instrument Sans', system-ui, sans-serif",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: HUB_CSS }} />

      {/* ===== header ===== */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "13px clamp(16px,4vw,48px)",
          background: "rgba(10,14,26,.8)",
          backdropFilter: "blur(16px)",
          borderBottom: divider,
          flexWrap: "wrap",
        }}
      >
        <a href="#markets" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="11" stroke={GOLD} strokeWidth="1.5" />
            <circle cx="13" cy="13" r="4.5" fill={GOLD} />
            <circle cx="21" cy="7" r="2" fill={GOLD} opacity="0.6" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: ".05em", whiteSpace: "nowrap" }}>
            Market &amp; Planning Hub
          </span>
        </a>
        <nav style={{ display: "flex", gap: 2, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
          {["Markets", "Sectors", "Macro", "Analyzer", "Funds", "Outlook", "Tools"].map((n) => (
            <a
              key={n}
              href={"#" + n.toLowerCase()}
              className="mh-nav"
              style={{ color: "#B9C2DC", fontSize: 13.5, padding: "7px 12px", borderRadius: 8 }}
            >
              {n}
            </a>
          ))}
        </nav>
        <a
          href={AIA_FUND_URL}
          target="_blank"
          rel="noopener"
          className="mh-aia"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: "1px solid rgba(245,197,88,.5)",
            background: "rgba(245,197,88,.08)",
            color: GOLD,
            fontSize: 12.5,
            fontWeight: 600,
            padding: "7px 14px",
            borderRadius: 8,
            whiteSpace: "nowrap",
          }}
        >
          AIA Fund Prices <span style={{ fontSize: 10 }}>↗</span>
        </a>
        <span style={{ fontSize: 10.5, color: MUTED, fontFamily: mono, whiteSpace: "nowrap" }}>
          {data.meta.stamp}
        </span>
      </header>

      {/* ===== ticker tape ===== */}
      <div
        style={{
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          padding: "9px 0",
          background: "rgba(255,255,255,.015)",
        }}
      >
        <div style={{ display: "flex", width: "max-content", animation: "mh-tape 32s linear infinite" }}>
          {tape2x.map((tp, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "baseline",
                padding: "0 16px",
                borderRight: divider,
                fontFamily: mono,
                fontSize: 11.5,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: SECON, fontWeight: 600 }}>{tp.name}</span>
              <span style={{ color: "#E8ECF6" }}>{tp.val}</span>
              <span style={{ color: tp.chgColor, fontWeight: 600 }}>{tp.chgTxt}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ===== markets ===== */}
      <section id="markets" style={{ borderBottom: divider }}>
        <div className="mh-mkt-grid" style={{ maxWidth: 1360, margin: "0 auto" }}>
          {/* watchlist */}
          <div
            style={{
              borderRight: "1px solid rgba(255,255,255,.08)",
              padding: "10px 8px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: ".16em", fontFamily: mono, padding: "4px 10px 8px" }}>
              WATCHLIST
            </div>
            {INSTR.map((i) => {
              const c = chgOf(i);
              const isSel = i.id === sel;
              const full = i.full.length > 20 ? i.full.slice(0, 19) + "…" : i.full;
              return (
                <button
                  key={i.id}
                  onClick={() => setSel(i.id)}
                  className="mh-watch"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    background: isSel ? "rgba(245,197,88,.08)" : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${isSel ? GOLD : "transparent"}`,
                    borderRadius: "0 7px 7px 0",
                    padding: "9px 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: mono, whiteSpace: "nowrap" }}>
                      {i.name}
                    </span>
                    <span style={{ fontSize: 10, color: MUTED, whiteSpace: "nowrap" }}>{full}</span>
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#E8ECF6", fontFamily: mono }}>{i.val}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: c >= 0 ? GREEN : RED, fontFamily: mono }}>
                      {(c >= 0 ? "+" : "") + c.toFixed(2) + "%"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* chart */}
          <div style={{ padding: "18px 20px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: mono, whiteSpace: "nowrap" }}>
                {selInstr.name}
              </div>
              <div style={{ fontSize: 32, fontWeight: 600, color: "#fff", fontFamily: mono }}>{selInstr.val}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: chgOf(selInstr) >= 0 ? GREEN : RED,
                  fontFamily: mono,
                  whiteSpace: "nowrap",
                }}
              >
                {(chgOf(selInstr) >= 0 ? "+" : "") + chgOf(selInstr).toFixed(1) + "% · " + tf}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.09)",
                  borderRadius: 9,
                  padding: 3,
                  marginLeft: "auto",
                }}
              >
                {TFS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTf(t)}
                    style={{
                      border: "none",
                      cursor: "pointer",
                      fontFamily: mono,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "5px 10px",
                      borderRadius: 6,
                      transition: "all .25s",
                      background: tf === t ? GOLD : "transparent",
                      color: tf === t ? "#0A0E1A" : SECON,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <svg
              width="100%"
              height="300"
              viewBox="0 0 620 300"
              preserveAspectRatio="none"
              style={{ display: "block", marginTop: 12 }}
            >
              <line x1="0" y1="75" x2="620" y2="75" stroke="rgba(255,255,255,.06)" />
              <line x1="0" y1="150" x2="620" y2="150" stroke="rgba(255,255,255,.06)" />
              <line x1="0" y1="225" x2="620" y2="225" stroke="rgba(255,255,255,.06)" />
              {candleView.candles.map((c, t) => (
                <g key={t}>
                  <line x1={c.cx} y1={c.wy1} x2={c.cx} y2={c.wy2} stroke={c.color} strokeWidth="1.4" />
                  <rect x={c.x} y={c.by} width={c.w} height={c.bh} rx="1.5" fill={c.color} />
                </g>
              ))}
            </svg>
          </div>

          {/* right rail */}
          <div
            style={{
              borderLeft: "1px solid rgba(255,255,255,.08)",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: ".16em", fontFamily: mono }}>PERFORMANCE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "1Y", v: y1 },
                { label: "YTD", v: ytd },
              ].map((s) => (
                <div key={s.label} style={{ ...panel, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 9.5, color: MUTED, fontFamily: mono }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: s.v >= 0 ? GREEN : RED, fontFamily: mono }}>
                    {(s.v >= 0 ? "+" : "") + s.v.toFixed(1) + "%"}
                  </div>
                  <svg width="100%" height="22" viewBox="0 0 100 28" preserveAspectRatio="none">
                    <path d={sparkPath(selInstr.data, 100, 28)} fill="none" stroke={s.v >= 0 ? GREEN : RED} strokeWidth="1.8" />
                  </svg>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: MUTED, letterSpacing: ".16em", fontFamily: mono, marginTop: 4 }}>
              VOLATILITY
            </div>
            {[
              { name: "Historical", pct: 28, color: "#5E7CE2" },
              { name: "Implied", pct: 68, color: GOLD },
              { name: "Realised", pct: 42, color: "#4D9FFF" },
            ].map((v) => (
              <div key={v.name}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontFamily: mono,
                    color: "#B9C2DC",
                    marginBottom: 4,
                  }}
                >
                  <span>{v.name}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{v.pct}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)" }}>
                  <div
                    style={{
                      height: "100%",
                      width: v.pct + "%",
                      background: v.color,
                      borderRadius: 2,
                      boxShadow: `0 0 8px ${v.color}`,
                      transition: "width .5s",
                    }}
                  />
                </div>
              </div>
            ))}
            <div style={{ marginTop: "auto", ...panel, background: "rgba(255,255,255,.03)", borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 9.5, color: MUTED, fontFamily: mono }}>RANGE · {tf}</div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontFamily: mono,
                  color: "#B9C2DC",
                  margin: "6px 0 4px",
                }}
              >
                <span>LOW</span>
                <span>HIGH</span>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 4,
                  borderRadius: 2,
                  background: "linear-gradient(90deg,#FF6A6A,#F5C558,#3EE68F)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -3,
                    left: (candleView.pos * 100).toFixed(0) + "%",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 0 8px rgba(255,255,255,.8)",
                    marginLeft: -5,
                    transition: "left .5s",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== sectors ===== */}
      <section id="sectors" style={{ borderBottom: divider }}>
        <div
          className="mh-two-col"
          style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)", alignItems: "center" }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.15 }}>
              S&amp;P 500, by sector.
            </h2>
            <p style={{ margin: "14px 0 0", color: SECON, fontSize: 14.5, lineHeight: 1.6, maxWidth: 400 }}>
              Each orb is a sector of the index — size reflects its weight, colour and glow track its move over the selected
              period. Hover or tap to explore.
            </p>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.09)",
                borderRadius: 10,
                padding: 4,
                marginTop: 20,
                width: "fit-content",
                flexWrap: "wrap",
              }}
            >
              {SEC_TFS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSecTf(t)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "7px 13px",
                    borderRadius: 7,
                    transition: "all .25s",
                    background: secTf === t ? GOLD : "transparent",
                    color: secTf === t ? "#0A0E1A" : SECON,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 22, borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16 }}>
              <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".14em", fontFamily: mono, whiteSpace: "nowrap" }}>
                SELECTED SECTOR · {secTf}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: "clamp(24px,2.6vw,32px)", fontWeight: 600, color: "#fff", fontFamily: mono }}>
                  {secSel.name}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: secChg >= 0 ? GREEN : RED, fontFamily: mono, whiteSpace: "nowrap" }}>
                  {(secChg >= 0 ? "+" : "") + secChg.toFixed(1) + "%"}
                </div>
                <div style={{ fontSize: 12, color: MUTED, fontFamily: mono, whiteSpace: "nowrap" }}>{secSel.w}% of index</div>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 13, color: SECON, lineHeight: 1.6, maxWidth: 420 }}>
                {(SECTOR_INFO[secSel.id] ?? ["", []])[0]}
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 9.5, color: MUTED, letterSpacing: ".14em", fontFamily: mono }}>TOP NAMES</span>
                {((SECTOR_INFO[secSel.id] ?? ["", []])[1] as string[]).map((n) => (
                  <span
                    key={n}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#B9C2DC",
                      border: "1px solid rgba(255,255,255,.14)",
                      borderRadius: 99,
                      padding: "3px 10px",
                      fontFamily: mono,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 14, maxWidth: 420 }}>
                {SEC_TFS.map((t) => {
                  const v = secSel.chg[t];
                  return (
                    <div key={t} style={{ ...panel, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: "7px 9px" }}>
                      <div style={{ fontSize: 9, color: MUTED, fontFamily: mono, letterSpacing: ".1em" }}>{t}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: v >= 0 ? GREEN : RED, fontFamily: mono }}>
                        {(v >= 0 ? "+" : "") + (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) + "%"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* orbs */}
          <div style={{ position: "relative", aspectRatio: "1", maxWidth: 560, margin: "0 auto", width: "100%" }}>
            <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,.06)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", inset: "15%", border: "1px dashed rgba(245,197,88,.14)", borderRadius: "50%" }} />
            {orbs.map((o) => (
              <div
                key={o.id}
                style={{
                  position: "absolute",
                  left: o.left,
                  top: o.top,
                  width: o.size,
                  height: o.size,
                  marginLeft: o.ml,
                  marginTop: o.ml,
                  transition: "all .7s cubic-bezier(.4,0,.2,1)",
                }}
              >
                <div style={{ width: "100%", height: "100%", animation: o.anim }}>
                  <div
                    className="mh-orb"
                    tabIndex={0}
                    onMouseEnter={() => setHoverSec(o.id)}
                    onClick={() => setHoverSec(o.id)}
                    onFocus={() => setHoverSec(o.id)}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: o.bg,
                      boxShadow: o.glow,
                      cursor: "pointer",
                      transition: "transform .35s,box-shadow .35s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      border: `1.5px solid ${o.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: o.fs,
                        fontWeight: 600,
                        color: "rgba(255,255,255,.95)",
                        letterSpacing: ".05em",
                        textShadow: "0 1px 6px rgba(0,0,0,.6)",
                        fontFamily: mono,
                        textAlign: "center",
                      }}
                    >
                      {o.label}
                    </span>
                    <span style={{ fontSize: o.fs2, fontWeight: 600, color: "#fff", textShadow: "0 1px 6px rgba(0,0,0,.7)", fontFamily: mono }}>
                      {o.chgTxt}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== asset ladder ===== */}
      <section style={{ borderBottom: divider }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
              Asset classes, ranked
            </h2>
            <span style={{ fontSize: 12.5, color: MUTED, fontFamily: mono }}>{tf} · CLICK A ROW TO LOAD IT IN THE CHART ABOVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 760 }}>
            {ladder.map((rrow) => (
              <button
                key={rrow.id}
                onClick={() => setSel(rrow.id)}
                className="mh-ladder"
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 1fr 68px",
                  alignItems: "center",
                  gap: 12,
                  background: rrow.rowBg,
                  border: `1px solid ${rrow.rowBorder}`,
                  borderRadius: 9,
                  padding: "10px 13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#E8ECF6", fontFamily: mono, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
                  {rrow.name}
                </span>
                <span style={{ position: "relative", height: 14, display: "block" }}>
                  <span style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,.15)" }} />
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      bottom: 2,
                      left: rrow.barLeft,
                      width: rrow.barW,
                      background: rrow.barBg,
                      borderRadius: 5,
                      boxShadow: `0 0 10px ${rrow.barGlow}`,
                      transition: "all .5s",
                    }}
                  />
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: rrow.chgColor, fontFamily: mono, textAlign: "right" }}>
                  {rrow.chgTxt}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ===== macro ===== */}
      <section id="macro" style={{ borderBottom: divider }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
            The numbers that matter
          </h2>
          <p style={{ margin: "0 0 22px", color: SECON, fontSize: 14.5, maxWidth: 560 }}>
            The handful of macro readings that drive most market headlines — and what each one means in plain English.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(255px,100%),1fr))", gap: 12 }}>
            {macro.map((m) => (
              <a
                key={m.name}
                href={m.href}
                target="_blank"
                rel="noopener"
                className="mh-macro"
                style={{
                  ...panel,
                  borderRadius: 14,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", fontFamily: mono, whiteSpace: "nowrap" }}>
                    {m.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: m.flagColor,
                      border: `1px solid ${m.flagBorder}`,
                      borderRadius: 6,
                      padding: "2px 7px",
                      fontFamily: mono,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.flag}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 27, fontWeight: 600, color: "#fff", fontFamily: mono }}>{m.val}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: m.chgColor, fontFamily: mono, whiteSpace: "nowrap" }}>
                    {m.chgTxt}
                  </span>
                </div>
                <svg width="100%" height="26" viewBox="0 0 100 28" preserveAspectRatio="none" style={{ display: "block" }}>
                  <path d={m.spark} fill="none" stroke={m.sparkColor} strokeWidth="1.7" style={{ filter: `drop-shadow(0 0 4px ${m.sparkColor})` }} />
                </svg>
                <div style={{ fontSize: 12, color: SECON, lineHeight: 1.5 }}>{m.note}</div>
                <div style={{ fontSize: 11, color: GOLD, lineHeight: 1.5, opacity: 0.85 }}>▸ {m.next}</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "auto",
                    paddingTop: 8,
                    borderTop: "1px solid rgba(255,255,255,.06)",
                  }}
                >
                  <span style={{ fontSize: 9.5, color: MUTED, fontFamily: mono, letterSpacing: ".08em" }}>{m.src}</span>
                  <span style={{ fontSize: 9.5, color: GOLD, fontFamily: mono, fontWeight: 600 }}>READ ↗</span>
                </div>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 12 }}>
            Readings refresh weekly from official sources where available; some values are indicative. Click a card to open the
            official source.
          </div>
        </div>
      </section>

      {/* ===== company analyzer ===== */}
      <section id="analyzer" style={{ borderBottom: divider }}>
        <div className="mh-two-col" style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)", alignItems: "start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.15 }}>
              Company analyzer
            </h2>
            <p style={{ margin: "14px 0 18px", color: SECON, fontSize: 14.5, lineHeight: 1.6, maxWidth: 400 }}>
              Search a company to generate its snapshot — performance, health radar, volatility and key metrics. Try “Apple”,
              “DBS” or “Nvidia”.
            </p>
            <div style={{ position: "relative", maxWidth: 420 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "11px 13px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="6" cy="6" r="4.6" stroke={MUTED} strokeWidth="1.4" />
                  <line x1="9.6" y1="9.6" x2="13" y2="13" stroke={MUTED} strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a company…"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontFamily: "var(--font-instrument), sans-serif",
                    fontSize: 14,
                  }}
                />
              </div>
              {company.matches.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "#0E1322",
                    border: "1px solid rgba(255,255,255,.14)",
                    borderRadius: 10,
                    overflow: "hidden",
                    zIndex: 30,
                    boxShadow: "0 12px 34px rgba(0,0,0,.6)",
                  }}
                >
                  {company.matches.map(([n, t]) => (
                    <button
                      key={t}
                      onClick={() => {
                        setCo(n);
                        setQuery("");
                      }}
                      className="mh-sug"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,.06)",
                        padding: "11px 14px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 13.5, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>{n}</span>
                      <span style={{ fontSize: 11, color: MUTED, fontFamily: mono }}>{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {COMPANIES.slice(0, 6).map(([n]) => {
                const active = n === co;
                return (
                  <button
                    key={n}
                    onClick={() => {
                      setCo(n);
                      setQuery("");
                    }}
                    className="mh-chip"
                    style={{
                      border: `1px solid ${active ? "rgba(245,197,88,.55)" : "rgba(255,255,255,.12)"}`,
                      background: active ? "rgba(245,197,88,.12)" : "transparent",
                      color: active ? GOLD : SECON,
                      fontFamily: mono,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: 99,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {/* radar */}
            <div style={{ ...panel, borderRadius: 14, padding: 16, marginTop: 20, maxWidth: 420 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", whiteSpace: "nowrap" }}>Company Health</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: company.healthColor, fontWeight: 600, whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: company.healthColor, boxShadow: `0 0 8px ${company.healthColor}`, display: "inline-block" }} />
                  {company.healthLabel}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <svg width="300" height="230" viewBox="0 0 300 230">
                  <polygon points={company.hexGrid1} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
                  <polygon points={company.hexGrid2} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
                  <polygon points={company.hexGrid3} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
                  {company.spokes.map((sp, i) => (
                    <line key={i} x1="150" y1="115" x2={sp.x} y2={sp.y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
                  ))}
                  <polygon
                    points={company.radarPts}
                    fill="rgba(245,197,88,.14)"
                    stroke={GOLD}
                    strokeWidth="1.8"
                    style={{ filter: "drop-shadow(0 0 6px rgba(245,197,88,.5))", transition: "all .6s" }}
                  />
                  <polygon points={company.radarPts2} fill="none" stroke="#2EE6C8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
                  <text x="150" y="16" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="middle">Past Performance</text>
                  <text x="242" y="74" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="start">Future Outlook</text>
                  <text x="242" y="166" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="start">Value</text>
                  <text x="150" y="222" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="middle">Dividends</text>
                  <text x="58" y="166" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="end">Profitability</text>
                  <text x="58" y="74" fill={SECON} fontSize="10.5" fontFamily="Instrument Sans" textAnchor="end">Growth</text>
                </svg>
              </div>
            </div>
          </div>
          {/* right analyzer card */}
          <div style={{ ...panel, borderRadius: 16, padding: "clamp(16px,2.5vw,24px)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{company.name}</div>
              <div style={{ fontSize: 11, color: MUTED, fontFamily: mono }}>{company.ticker}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: company.chgColor, fontFamily: mono, marginLeft: "auto", whiteSpace: "nowrap" }}>
                {company.chgTxt}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "REV GROWTH", chg: company.revChg, chgColor: company.revChgColor, val: company.revenue, line: company.spark1, area: company.spark1Area },
                { label: "EPS (TTM)", chg: company.epsChg, chgColor: company.epsChgColor, val: company.eps, line: company.spark2, area: company.spark2Area },
              ].map((c) => (
                <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, fontFamily: mono }}>
                    <span style={{ color: MUTED, whiteSpace: "nowrap" }}>{c.label}</span>
                    <span style={{ color: c.chgColor, fontWeight: 600 }}>{c.chg}</span>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 600, color: "#fff", fontFamily: mono, margin: "4px 0 6px" }}>{c.val}</div>
                  <svg width="100%" height="34" viewBox="0 0 100 34" preserveAspectRatio="none">
                    <polygon points={c.area} fill={GREEN} fillOpacity="0.15" />
                    <path d={c.line} fill="none" stroke={GREEN} strokeWidth="1.6" />
                  </svg>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 0 8px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", whiteSpace: "nowrap" }}>Volatility Index</div>
              <div style={{ fontSize: 11.5, color: company.volFlagColor, fontWeight: 600, whiteSpace: "nowrap" }}>{company.volFlag}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 11 }}>
              {company.volBars.map((v) => (
                <div key={v.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#B9C2DC", marginBottom: 4 }}>
                    <span style={{ whiteSpace: "nowrap" }}>{v.name}</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontFamily: mono }}>{v.pct}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)" }}>
                    <div style={{ height: "100%", width: v.w, background: v.color, borderRadius: 2, boxShadow: `0 0 8px ${v.color}`, transition: "width .6s" }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Implied Vol Surface</div>
              <svg width="100%" height="70" viewBox="0 0 380 70" preserveAspectRatio="none">
                <polygon points={company.volSurfArea} fill={ORANGE} fillOpacity="0.35" />
                <path d={company.volSurf} fill="none" stroke={ORANGE} strokeWidth="1.8" style={{ filter: "drop-shadow(0 0 5px rgba(255,138,60,.6))" }} />
              </svg>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Market Metrics</div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, overflow: "hidden" }}>
              {company.metrics.map((m) => (
                <div key={m.name} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 12.5 }}>
                  <span style={{ color: "#B9C2DC", whiteSpace: "nowrap" }}>{m.name}</span>
                  <span style={{ color: m.color, fontWeight: 600, fontFamily: mono }}>{m.val}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 12 }}>Illustrative, generated figures — not real company data or a recommendation.</div>
          </div>
        </div>
      </section>

      {/* ===== funds ===== */}
      <section id="funds" style={{ borderBottom: divider }}>
        <div className="mh-two-col" style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)", alignItems: "start" }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", color: GOLD }}>AIA ILP FUNDS</div>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em", lineHeight: 1.15 }}>
              Fund analyzer
            </h2>
            <p style={{ margin: "14px 0 18px", color: SECON, fontSize: 14.5, lineHeight: 1.6, maxWidth: 420 }}>
              Pick a fund to see what it actually invests in — the asset mix, top holdings, and where in the world your money sits.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FUNDS.map((f, i) => {
                const active = i === fund;
                return (
                  <button
                    key={f.short}
                    onClick={() => setFund(i)}
                    className="mh-chip"
                    style={{
                      border: `1px solid ${active ? "rgba(245,197,88,.55)" : "rgba(255,255,255,.12)"}`,
                      background: active ? "rgba(245,197,88,.12)" : "transparent",
                      color: active ? GOLD : SECON,
                      fontFamily: mono,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "7px 13px",
                      borderRadius: 99,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.short}
                  </button>
                );
              })}
            </div>
            <div style={{ ...panel, borderRadius: 14, padding: 16, marginTop: 20, maxWidth: 420 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", marginBottom: 8 }}>Asset Allocation</div>
              <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap", justifyContent: "center" }}>
                <svg width="150" height="150" viewBox="0 0 140 140">
                  {fundView.fSegs.map((s, i) => (
                    <circle
                      key={i}
                      cx="70"
                      cy="70"
                      r="54"
                      fill="none"
                      stroke={s.color}
                      strokeWidth="17"
                      strokeDasharray={s.da}
                      strokeDashoffset={s.off}
                      transform="rotate(-90 70 70)"
                      style={{ transition: "stroke-dasharray .8s,stroke-dashoffset .8s", filter: `drop-shadow(0 0 4px ${s.color})` }}
                    />
                  ))}
                </svg>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {fundView.fLegend.map((l) => (
                    <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C7D0E8" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, boxShadow: `0 0 6px ${l.color}`, flex: "none" }} />
                      {l.name} <span style={{ color: "#fff", fontWeight: 600, fontFamily: mono }}>{l.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <a
              href={AIA_FUND_URL}
              target="_blank"
              rel="noopener"
              className="mh-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 18,
                fontSize: 13.5,
                fontWeight: 600,
                color: GOLD,
                border: "1px solid rgba(245,197,88,.4)",
                borderRadius: 9,
                padding: "11px 18px",
                minHeight: 44,
                boxSizing: "border-box",
              }}
            >
              Live prices &amp; factsheets on aia.com.sg <span style={{ fontSize: 11 }}>↗</span>
            </a>
          </div>
          {/* fund detail */}
          <div style={{ ...panel, borderRadius: 16, padding: "clamp(16px,2.5vw,24px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#fff" }}>{F.name}</div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: riskColor(F.lvl),
                  border: `1px solid ${riskColor(F.lvl)}55`,
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontFamily: mono,
                  whiteSpace: "nowrap",
                }}
              >
                {F.risk}
              </span>
              <div style={{ fontSize: 13, fontWeight: 600, color: F.ytd >= 0 ? GREEN : RED, fontFamily: mono, marginLeft: "auto", whiteSpace: "nowrap" }}>
                {sgn(F.ytd) + " YTD"}
              </div>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 12.5, color: SECON, lineHeight: 1.55 }}>{F.about}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "BID PRICE", val: F.nav },
                { label: "FUND SIZE", val: F.size },
              ].map((c) => (
                <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, fontFamily: mono, whiteSpace: "nowrap" }}>{c.label}</div>
                  <div style={{ fontSize: 21, fontWeight: 600, color: "#fff", fontFamily: mono, marginTop: 4 }}>{c.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Top Holdings</div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {fundView.fHoldings.map((h) => (
                <div key={h.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#B9C2DC", marginBottom: 4 }}>
                    <span style={{ whiteSpace: "nowrap" }}>{h.name}</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontFamily: mono }}>{h.pct}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)" }}>
                    <div style={{ height: "100%", width: h.w, background: GOLD, borderRadius: 2, boxShadow: "0 0 8px rgba(245,197,88,.5)", transition: "width .6s" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Where it&apos;s invested</div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {fundView.fGeo.map((gg) => (
                <div key={gg.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#B9C2DC", marginBottom: 4 }}>
                    <span style={{ whiteSpace: "nowrap" }}>{gg.name}</span>
                    <span style={{ color: "#fff", fontWeight: 600, fontFamily: mono }}>{gg.pct}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.08)" }}>
                    <div style={{ height: "100%", width: gg.w, background: "#4D9FFF", borderRadius: 2, boxShadow: "0 0 8px rgba(77,159,255,.5)", transition: "width .6s" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Returns</div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, overflow: "hidden" }}>
              {fundView.fReturns.map((rr) => (
                <div key={rr.name} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", fontSize: 12.5 }}>
                  <span style={{ color: "#B9C2DC", whiteSpace: "nowrap" }}>{rr.name}</span>
                  <span style={{ color: rr.color, fontWeight: 600, fontFamily: mono }}>{rr.val}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Fund Facts</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 6 }}>
              {fundView.fFacts.map((ff) => (
                <div key={ff.name} style={{ ...panel, background: "rgba(255,255,255,.03)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 8.5, color: MUTED, fontFamily: mono, letterSpacing: ".1em", whiteSpace: "nowrap" }}>{ff.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#E8ECF6", fontFamily: mono, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ff.val}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8ECF6", margin: "16px 0 8px" }}>Manager&apos;s take</div>
            <div style={{ background: "rgba(245,197,88,.05)", border: "1px solid rgba(245,197,88,.2)", borderRadius: 12, padding: 14, fontSize: 12.5, color: "#B9C2DC", lineHeight: 1.6 }}>
              {F.commentary}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
              Real AIA fund names; composition, commentary and figures are illustrative. Check the official{" "}
              <a href={AIA_FUND_URL} target="_blank" rel="noopener">
                AIA fund prices &amp; factsheets
              </a>{" "}
              for actual data.
            </div>
          </div>
        </div>
      </section>

      {/* ===== outlook ===== */}
      <section id="outlook" style={{ borderBottom: divider }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(30px,4vw,50px) clamp(16px,4vw,48px)" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", color: GOLD }}>READING THE ROOM</div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
            Which fund, for which horizon?
          </h2>
          <p style={{ margin: "0 0 20px", color: SECON, fontSize: 14.5, maxWidth: 600, lineHeight: 1.6 }}>
            Given today&apos;s backdrop — cooling inflation, an easing Fed, a calm VIX — the case for each fund changes with how
            long your money stays invested. Pick a horizon.
          </p>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
            {HORIZONS.map((h, i) => (
              <button
                key={h.label}
                onClick={() => setHorizon(i)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  fontFamily: mono,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: 7,
                  transition: "all .25s",
                  background: i === horizon ? GOLD : "transparent",
                  color: i === horizon ? "#0A0E1A" : SECON,
                  whiteSpace: "nowrap",
                }}
              >
                {h.label}
              </button>
            ))}
          </div>
          <div
            style={{
              margin: "18px 0 20px",
              padding: "14px 18px",
              ...panel,
              borderLeft: `2px solid ${GOLD}`,
              borderRadius: "0 12px 12px 0",
              fontSize: 13.5,
              color: "#B9C2DC",
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            {H.sentiment}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 12 }}>
            {H.picks.map((p, n) => {
              const pf = FUNDS[p.i];
              return (
                <div key={n} className="mh-pick" style={{ ...panel, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 10, transition: "border-color .3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: "rgba(245,197,88,.55)", fontFamily: mono }}>{"0" + (n + 1)}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: GOLD, border: "1px solid rgba(245,197,88,.4)", borderRadius: 6, padding: "2px 8px", fontFamily: mono, whiteSpace: "nowrap" }}>
                      {p.tag}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: riskColor(pf.lvl), fontFamily: mono, marginLeft: "auto", whiteSpace: "nowrap" }}>{pf.risk}</span>
                  </div>
                  <div style={{ fontSize: 15.5, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>{pf.name}</div>
                  <div style={{ fontSize: 12.5, color: SECON, lineHeight: 1.6 }}>{p.reason}</div>
                  <a
                    href="#funds"
                    onClick={() => setFund(p.i)}
                    className="mh-link"
                    style={{ marginTop: "auto", fontSize: 12, fontWeight: 600, color: GOLD, fontFamily: mono }}
                  >
                    VIEW IN FUND ANALYZER →
                  </a>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: 12, marginTop: 12 }}>
            <div style={{ background: "rgba(255,106,106,.04)", border: "1px solid rgba(255,106,106,.2)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: RED, fontFamily: mono, letterSpacing: ".14em", marginBottom: 12 }}>WHAT COULD GO WRONG</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {H.risks.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, color: "#B9C2DC", lineHeight: 1.55 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: RED, boxShadow: "0 0 6px rgba(255,106,106,.6)", flex: "none", marginTop: 6 }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "rgba(245,197,88,.04)", border: "1px solid rgba(245,197,88,.2)", borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: GOLD, fontFamily: mono, letterSpacing: ".14em", marginBottom: 12 }}>SIGNPOSTS TO WATCH</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {H.signs.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12.5, color: "#B9C2DC", lineHeight: 1.55 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: "0 0 6px rgba(245,197,88,.6)", flex: "none", marginTop: 6 }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 14, lineHeight: 1.5, maxWidth: 760 }}>
            Educational reasoning based on illustrative market readings — not a recommendation or personalised advice. Fund choice
            depends on your goals, risk tolerance and existing holdings; speak to a licensed adviser.
          </div>
        </div>
      </section>

      {/* ===== tools ===== */}
      <section id="tools" style={{ borderBottom: divider }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(34px,5vw,60px) clamp(16px,4vw,48px)" }}>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".22em", color: GOLD }}>PLANNING TOOLS</div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
            Play with the numbers
          </h2>
          <p style={{ margin: "0 0 24px", color: SECON, fontSize: 14.5 }}>
            Everything runs on your device. Drag the sliders — charts respond live. All figures in SGD, illustrative only.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))", gap: 14 }}>
            {/* Investment growth */}
            <div style={{ gridColumn: "1/-1", ...panel, borderRadius: 16, padding: "clamp(18px,3vw,28px)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(20px,4vw,44px)" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 19, color: "#fff" }}>Investment Growth</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: SECON }}>How compounding builds over time.</p>
                  <Slider label="Initial investment" value={fmtSGD(g.init)} min={0} max={500000} step={5000} v={g.init} onChange={(v) => setG((s) => ({ ...s, init: v }))} />
                  <Slider label="Monthly contribution" value={fmtSGD(g.monthly)} min={0} max={5000} step={50} v={g.monthly} onChange={(v) => setG((s) => ({ ...s, monthly: v }))} />
                  <Slider label="Annual return" value={g.ret + "%"} min={0} max={12} step={0.5} v={g.ret} onChange={(v) => setG((s) => ({ ...s, ret: v }))} />
                  <Slider label="Years" value={String(g.yrs)} min={1} max={40} step={1} v={g.yrs} onChange={(v) => setG((s) => ({ ...s, yrs: v }))} />
                </div>
                <div style={{ flex: 1.3, minWidth: 280, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 10 }}>
                    <Stat label="PROJECTED VALUE" big value={fmtSGD(disp.fv)} color="#fff" glow="0 0 24px rgba(245,197,88,.35)" />
                    <Stat label="YOU PUT IN" value={fmtSGD(disp.contrib)} color="#B9C2DC" />
                    <Stat label="COMPOUND GROWTH" value={fmtSGD(disp.growth)} color={GOLD} glow="0 0 14px rgba(245,197,88,.5)" />
                  </div>
                  <svg width="100%" height="190" viewBox="0 0 600 220" preserveAspectRatio="none" style={{ display: "block", marginTop: "auto" }}>
                    <polygon points={growthGeom.gTotalArea} fill={GOLD} fillOpacity="0.16" />
                    <path d={growthGeom.gTotalLine} fill="none" stroke={GOLD} strokeWidth="2.4" style={{ filter: `drop-shadow(0 0 6px ${GOLD})` }} />
                    <polygon points={growthGeom.gContribArea} fill="#5E7CE2" fillOpacity="0.18" />
                    <path d={growthGeom.gContribLine} fill="none" stroke="#8FA3D9" strokeWidth="2" />
                  </svg>
                  <div style={{ display: "flex", gap: 18, fontSize: 11.5, color: SECON, marginTop: 6 }}>
                    <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#8FA3D9", marginRight: 6 }} />Contributions</span>
                    <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: GOLD, marginRight: 6 }} />Total with growth</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: MUTED, marginTop: 14 }}>Illustrative only. Assumes a constant return, compounded monthly, before fees and tax.</div>
            </div>

            {/* Inflation */}
            <div style={{ ...panel, borderRadius: 16, padding: "clamp(18px,3vw,26px)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 19, color: "#fff" }}>Inflation Eroder</h3>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: SECON }}>What cash quietly loses.</p>
              <Slider label="Amount today" value={fmtSGD(inf.amt)} min={10000} max={1000000} step={10000} v={inf.amt} onChange={(v) => setInf((s) => ({ ...s, amt: v }))} />
              <Slider label="Inflation" value={inf.rate + "%"} min={0.5} max={8} step={0.25} v={inf.rate} onChange={(v) => setInf((s) => ({ ...s, rate: v }))} />
              <Slider label="Years" value={String(inf.yrs)} min={1} max={40} step={1} v={inf.yrs} onChange={(v) => setInf((s) => ({ ...s, yrs: v }))} />
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "clamp(18px,4vw,40px)", margin: "20px 0 8px", minHeight: 150 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle at 34% 30%,#FFE7AE,#F5C558 50%,rgba(245,197,88,.1) 85%)", boxShadow: "0 0 34px rgba(245,197,88,.5)", margin: "0 auto" }} />
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 8, fontFamily: mono }}>TODAY</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: infOrbPx, height: infOrbPx, borderRadius: "50%", background: "radial-gradient(circle at 34% 30%,#8FA3D9,#5E7CE2 50%,rgba(94,124,226,.1) 85%)", boxShadow: "0 0 26px rgba(94,124,226,.45)", margin: "0 auto", transition: "width .6s,height .6s" }} />
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 8, fontFamily: mono }}>IN {inf.yrs} YEARS</div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", fontFamily: mono }}>REAL PURCHASING POWER</div>
                <div style={{ fontSize: 30, fontWeight: 600, color: "#fff", fontFamily: mono }}>{fmtSGD(disp.real)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: RED, fontFamily: mono }}>−{(100 - (calc.real / inf.amt) * 100).toFixed(0)}% buying power</div>
              </div>
              <div style={{ fontSize: 10.5, color: MUTED, marginTop: "auto", paddingTop: 14 }}>Illustrative only. Assumes constant inflation.</div>
            </div>

            {/* Retirement gap */}
            <div style={{ ...panel, borderRadius: 16, padding: "clamp(18px,3vw,26px)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 19, color: "#fff" }}>Retirement Gap</h3>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: SECON }}>Projected pot vs what you may need.</p>
              <Slider label="Your age" value={String(r.age)} min={20} max={60} step={1} v={r.age} onChangeEvt={setRField("age")} />
              <Slider label="Retire at" value={String(r.retAge)} min={40} max={70} step={1} v={r.retAge} onChangeEvt={setRField("retAge")} />
              <Slider label="Monthly income needed" value={fmtSGD(r.income)} min={1000} max={15000} step={250} v={r.income} onChangeEvt={setRField("income")} />
              <Slider label="Current savings" value={fmtSGD(r.savings)} min={0} max={2000000} step={10000} v={r.savings} onChangeEvt={setRField("savings")} />
              <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: "center", margin: "18px 0 6px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 150, height: 150, flex: "none" }}>
                  <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle cx="75" cy="75" r="62" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="11" />
                    <circle
                      cx="75"
                      cy="75"
                      r="62"
                      fill="none"
                      stroke={ratio >= 1 ? GREEN : ratio >= 0.65 ? GOLD : "#FF7A5A"}
                      strokeWidth="11"
                      strokeLinecap="round"
                      strokeDasharray="389.6"
                      strokeDashoffset={(CIRC * (1 - ratio)).toFixed(1)}
                      transform="rotate(-90 75 75)"
                      style={{ transition: "stroke-dashoffset .8s cubic-bezier(.4,0,.2,1),stroke .5s", filter: `drop-shadow(0 0 8px ${ratio >= 1 ? GREEN : ratio >= 0.65 ? GOLD : "#FF7A5A"})` }}
                    />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", fontFamily: mono }}>{Math.round(ratio * 100)}%</div>
                    <div style={{ fontSize: 9.5, color: MUTED, letterSpacing: ".14em", fontFamily: mono }}>FUNDED</div>
                  </div>
                </div>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", fontFamily: mono }}>PROJECTED POT</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#fff", fontFamily: mono }}>{fmtSGD(disp.pot)}</div>
                  <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", marginTop: 8, fontFamily: mono }}>ESTIMATED NEED</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#B9C2DC", fontFamily: mono }}>{fmtSGD(disp.need)}</div>
                  <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", marginTop: 8, fontFamily: mono }}>{gapPos ? "SURPLUS" : "SHORTFALL"}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: gapPos ? GREEN : "#FF7A5A", fontFamily: mono }}>
                    {(gapPos ? "+" : "−") + fmtSGD(Math.abs(disp.gap))}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: MUTED, marginTop: "auto", paddingTop: 14 }}>
                Illustrative only. Assumes 5% p.a. growth on savings and ~25 years of retirement income (4% rule). Excludes CPF.
              </div>
            </div>

            {/* Rule of 72 */}
            <div style={{ ...panel, borderRadius: 16, padding: "clamp(18px,3vw,26px)", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 19, color: "#fff" }}>Rule of 72</h3>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: SECON }}>How long money takes to double.</p>
              <Slider label="Annual return" value={r72 + "%"} min={1} max={15} step={0.5} v={r72} onChange={(v) => setR72(v)} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "24px 0 10px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: "#B9C2DC", fontSize: 14, fontFamily: mono }}>×1</div>
                <svg width="46" height="14" viewBox="0 0 46 14" fill="none"><path d="M1 7h38m0 0l-6-5m6 5l-6 5" stroke={MUTED} strokeWidth="1.6" strokeLinecap="round" /></svg>
                <div style={{ width: 84, height: 84, borderRadius: "50%", background: "radial-gradient(circle at 34% 30%,#FFE7AE,#F5C558 55%)", boxShadow: "0 0 30px rgba(245,197,88,.55)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0A0E1A", fontSize: 18, fontFamily: mono }}>×2</div>
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: "clamp(34px,4vw,46px)", fontWeight: 600, color: "#fff", fontFamily: mono, textShadow: "0 0 24px rgba(245,197,88,.4)" }}>
                  {disp.dbl.toFixed(1)} <span style={{ fontSize: 18, color: MUTED, fontWeight: 400 }}>years</span>
                </div>
                <div style={{ fontSize: 13, color: SECON }}>to double at {r72}% a year</div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden", margin: "10px 0 4px" }}>
                <div style={{ height: "100%", width: Math.min(100, (calc.dbl / 30) * 100).toFixed(0) + "%", background: GOLD, boxShadow: "0 0 10px rgba(245,197,88,.7)", transition: "width .5s", borderRadius: 3 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, fontFamily: mono }}><span>FASTER</span><span>SLOWER</span></div>
              <div style={{ fontSize: 10.5, color: MUTED, marginTop: "auto", paddingTop: 14 }}>Illustrative only. The rule of 72 is an approximation (72 ÷ return %).</div>
            </div>

            {/* Risk quiz */}
            <div style={{ gridColumn: "1/-1", ...panel, borderRadius: 16, padding: "clamp(18px,3vw,28px)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 19, color: "#fff" }}>Risk Tolerance Quiz</h3>
                <span style={{ fontSize: 12, color: SECON }}>6 quick taps · educational, not a recommendation</span>
              </div>
              {!quiz.done ? (
                <div style={{ maxWidth: 640, marginTop: 18 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                    {QUIZ.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: i < quiz.i ? GOLD : i === quiz.i ? "rgba(245,197,88,.4)" : "rgba(255,255,255,.1)",
                          boxShadow: i < quiz.i ? "0 0 8px rgba(245,197,88,.6)" : "none",
                          transition: "all .4s",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: GOLD, fontFamily: mono, letterSpacing: ".16em" }}>QUESTION {Math.min(quiz.i + 1, 6)} / 6</div>
                  <div style={{ fontSize: "clamp(17px,2.2vw,21px)", fontWeight: 600, color: "#fff", margin: "8px 0 16px" }}>{QUIZ[Math.min(quiz.i, 5)].q}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {QUIZ[Math.min(quiz.i, 5)].o.map(([t, score]) => (
                      <button
                        key={t}
                        onClick={() => pickQuiz(score)}
                        className="mh-quizopt"
                        style={{
                          textAlign: "left",
                          fontFamily: "inherit",
                          fontSize: 14.5,
                          color: "#E8ECF6",
                          background: "rgba(255,255,255,.03)",
                          border: "1px solid rgba(255,255,255,.1)",
                          borderRadius: 10,
                          padding: "13px 16px",
                          cursor: "pointer",
                          minHeight: 44,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "clamp(20px,4vw,50px)", flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
                  <div style={{ flex: 1, minWidth: 250 }}>
                    <div style={{ fontSize: 11, color: MUTED, letterSpacing: ".16em", fontFamily: mono }}>YOUR PROFILE</div>
                    <div style={{ fontSize: "clamp(28px,3.4vw,40px)", fontWeight: 700, color: GOLD, textShadow: "0 0 24px rgba(245,197,88,.4)" }}>{prof.name}</div>
                    <p style={{ color: "#B9C2DC", fontSize: 14.5, lineHeight: 1.6, maxWidth: 440 }}>{prof.blurb}</p>
                    <button
                      onClick={() => setQuiz({ i: 0, score: 0, done: false })}
                      className="mh-btn-ghost"
                      style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: GOLD, background: "transparent", border: "1px solid rgba(245,197,88,.4)", borderRadius: 8, padding: "9px 18px", cursor: "pointer", minHeight: 44 }}
                    >
                      Retake quiz
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
                    <svg width="150" height="150" viewBox="0 0 140 140">
                      {quizSegs.map((s, i) => (
                        <circle key={i} cx="70" cy="70" r="54" fill="none" stroke={s.color} strokeWidth="17" strokeDasharray={s.da} strokeDashoffset={s.off} transform="rotate(-90 70 70)" style={{ transition: "stroke-dasharray .8s,stroke-dashoffset .8s", filter: `drop-shadow(0 0 4px ${s.color})` }} />
                      ))}
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {prof.alloc.map(([n, pct, col]) => (
                        <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#C7D0E8" }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: col, boxShadow: `0 0 6px ${col}`, flex: "none" }} />
                          {n} <span style={{ color: "#fff", fontWeight: 600, fontFamily: mono }}>{pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ borderBottom: divider }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "clamp(40px,6vw,72px) clamp(16px,4vw,48px)", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(24px,3vw,34px)", fontWeight: 700, color: "#fff", letterSpacing: "-.01em" }}>
            Questions about <em style={{ color: GOLD, fontStyle: "italic" }}>your</em> situation?
          </h2>
          <p style={{ margin: "14px auto 22px", color: SECON, fontSize: 14.5, lineHeight: 1.6, maxWidth: 520 }}>
            The tools above are a starting point. A licensed adviser can map them to your goals, existing holdings, CPF and risk
            tolerance.
          </p>
          <a
            href={AIA_FUND_URL}
            target="_blank"
            rel="noopener"
            className="mh-aia"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: GOLD,
              color: "#0A0E1A",
              fontWeight: 700,
              fontSize: 14,
              padding: "13px 26px",
              borderRadius: 10,
              boxShadow: "0 0 30px rgba(245,197,88,.35)",
            }}
          >
            Book a review
          </a>
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 26, lineHeight: 1.6, maxWidth: 620, marginLeft: "auto", marginRight: "auto" }}>
            This site is for educational purposes only and does not constitute financial advice, a recommendation, or an offer to
            buy or sell any product. Market data is illustrative and/or delayed and refreshes weekly. Investments can fall as well
            as rise; past performance is not indicative of future results. Fund names are the property of AIA; figures shown here
            are illustrative — always verify against official sources before acting.
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 14, fontFamily: mono, opacity: 0.7 }}>{data.meta.stamp}</div>
        </div>
      </section>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */
function Slider({
  label,
  value,
  min,
  max,
  step,
  v,
  onChange,
  onChangeEvt,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  v: number;
  onChange?: (v: number) => void;
  onChangeEvt?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label style={{ display: "block", fontSize: 12.5, color: "#B9C2DC", marginTop: 8 }}>
      {label}
      <span style={{ float: "right", color: "#fff", fontWeight: 600, fontFamily: mono }}>{value}</span>
      <input
        className="mh-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => (onChangeEvt ? onChangeEvt(e) : onChange?.(+e.target.value))}
      />
    </label>
  );
}

function Stat({
  label,
  value,
  color,
  big,
  glow,
}: {
  label: string;
  value: string;
  color: string;
  big?: boolean;
  glow?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: ".12em", fontFamily: mono }}>{label}</div>
      <div
        style={{
          fontSize: big ? "clamp(28px,3.4vw,40px)" : "clamp(18px,2vw,24px)",
          fontWeight: 600,
          color,
          fontFamily: mono,
          textShadow: glow,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- injected CSS (keyframes, hover, range, reduced-motion) ---------- */
const HUB_CSS = `
.mh-nav:hover{color:#fff;background:rgba(255,255,255,.06)}
.mh-aia:hover{background:rgba(245,197,88,.16)}
.mh-watch:hover{background:rgba(255,255,255,.05)}
.mh-orb:hover{transform:scale(1.14)}
.mh-ladder:hover{border-color:rgba(245,197,88,.5)!important}
.mh-macro:hover{border-color:rgba(245,197,88,.5)!important;transform:translateY(-2px)}
.mh-sug:hover{background:rgba(245,197,88,.08)}
.mh-chip:hover{border-color:#F5C558!important}
.mh-link:hover{color:#FFD97A}
.mh-pick:hover{border-color:rgba(245,197,88,.4)!important}
.mh-quizopt:hover{border-color:#F5C558!important;background:rgba(245,197,88,.07);transform:translateX(4px)}
.mh-btn-ghost:hover{background:rgba(245,197,88,.12)}
a{color:#F5C558;text-decoration:none}
@keyframes mh-drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(7px,-11px)}}
@keyframes mh-drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-9px,8px)}}
@keyframes mh-drift3{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,10px)}}
@keyframes mh-tape{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.mh-range{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,.12);outline:none;width:100%;cursor:pointer;margin:10px 0 4px}
.mh-range::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#F5C558;box-shadow:0 0 12px rgba(245,197,88,.7);cursor:pointer;border:2px solid #0A0E1A}
.mh-range::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#F5C558;box-shadow:0 0 12px rgba(245,197,88,.7);cursor:pointer;border:2px solid #0A0E1A}
.mh-mkt-grid{display:grid;grid-template-columns:220px 1fr 250px;gap:0}
.mh-two-col{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(380px,100%),1fr));gap:clamp(20px,3vw,44px)}
@media (max-width:820px){.mh-mkt-grid{grid-template-columns:1fr}}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition-duration:.01ms!important}}
`;
