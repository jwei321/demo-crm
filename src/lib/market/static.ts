// Editorial / rarely-changing copy for the Market & Planning Hub.
// This is spec text (descriptions, "what's next" lines, source links, outlook
// reasoning, quiz). The weekly job does NOT touch this file — it only refreshes
// the numbers in data/market.json. Update copy here monthly if the regime shifts.

import type { AllocSlice } from "./types";

export const SECTOR_INFO: Record<string, [string, string[]]> = {
  tech: [
    "Software, semiconductors and hardware — the index's engine. One-third of the S&P 500 by weight, and the source of most of this cycle's gains via AI capex.",
    ["Apple", "Microsoft", "NVIDIA"],
  ],
  fin: [
    "Banks, insurers, payment networks and asset managers. Earnings track interest rates and credit conditions — cuts squeeze margins but boost deal-making.",
    ["Berkshire", "JPMorgan", "Visa"],
  ],
  health: [
    "Pharma, biotech, devices and insurers. Demand is defensive — people don't skip medicine in recessions. GLP-1 drugs are the current growth story.",
    ["Eli Lilly", "UnitedHealth", "J&J"],
  ],
  consd: [
    "Retail, autos, travel and leisure — the discretionary wallet. First to feel it when consumers tighten, first to rip when confidence returns.",
    ["Amazon", "Tesla", "Home Depot"],
  ],
  comms: [
    "Internet platforms, media and telecoms — dominated by the ad duopoly and streaming. Behaves more like tech than telephone lines.",
    ["Alphabet", "Meta", "Netflix"],
  ],
  indu: [
    "Aerospace, machinery, transport and defence. The classic economy-tracker — order books here confirm or deny the \"soft landing\".",
    ["GE Aerospace", "Caterpillar", "Uber"],
  ],
  staples: [
    "Food, beverages and household basics. Demand barely moves with the cycle — the sector you hide in, not the one you get rich in.",
    ["P&G", "Costco", "Coca-Cola"],
  ],
  energy: [
    "Oil & gas majors and services. Tracks crude more than the index — a hedge against the inflation shocks that hurt everything else.",
    ["ExxonMobil", "Chevron", "ConocoPhillips"],
  ],
  util: [
    "Power and water utilities — bond-like dividend payers, so rate-sensitive. Data-centre electricity demand is the new growth angle.",
    ["NextEra", "Southern Co", "Duke Energy"],
  ],
  reit: [
    "Listed property — offices, towers, warehouses, data centres. The most rate-sensitive sector in the index; cuts are its oxygen.",
    ["Prologis", "American Tower", "Equinix"],
  ],
  mat: [
    "Chemicals, miners and construction materials. Rides global industrial demand and the commodity cycle — China matters most here.",
    ["Linde", "Sherwin-Williams", "Freeport"],
  ],
};

export const MACRO_NEXT: Record<string, string> = {
  "CPI (YOY)": "Next print mid-Aug — a reading under 2.3% would cement a September cut.",
  "CORE CPI (YOY)": "Watch shelter costs — the last sticky component holding core up.",
  VIX: "Sub-15 rarely lasts a full quarter — hedging is historically cheap here.",
  UNEMPLOYMENT: "Above ~4.4% would start triggering recession-rule chatter.",
  "PMI (MFG)": "Two more months above 50 would confirm the manufacturing turn.",
  "FED FUNDS": "Futures price the next cut in September, another in December.",
  "US GDP (QOQ)": "Q2 advance estimate lands late July — consensus near 2%.",
  "SG CPI (YOY)": "MAS reviews policy in October — cooling CPI gives room to ease.",
};

export const MACRO_SOURCES: Record<string, [string, string]> = {
  "CPI (YOY)": ["US BLS", "https://www.bls.gov/cpi/"],
  "CORE CPI (YOY)": ["US BLS", "https://www.bls.gov/cpi/"],
  VIX: ["CBOE", "https://www.cboe.com/tradable_products/vix/"],
  UNEMPLOYMENT: ["US BLS", "https://www.bls.gov/news.release/empsit.nr0.htm"],
  "PMI (MFG)": [
    "ISM",
    "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/",
  ],
  "FED FUNDS": ["FEDERAL RESERVE", "https://www.federalreserve.gov/monetarypolicy/openmarket.htm"],
  "US GDP (QOQ)": ["US BEA", "https://www.bea.gov/data/gdp/gross-domestic-product"],
  "SG CPI (YOY)": [
    "SINGSTAT",
    "https://www.singstat.gov.sg/find-data/search-by-theme/economy/prices-and-price-indices/latest-data",
  ],
};

export const AIA_FUND_URL =
  "https://www.aia.com.sg/en/our-products/save-and-invest/aia-funds-information/fund-performance";

// Company list for the analyzer (name, ticker). Figures are generated from a
// hash of the name (deterministic), so this list is purely which names appear.
export const COMPANIES: [string, string][] = [
  ["NVIDIA", "NVDA"],
  ["Apple", "AAPL"],
  ["Microsoft", "MSFT"],
  ["Alphabet", "GOOGL"],
  ["Tesla", "TSLA"],
  ["Amazon", "AMZN"],
  ["Meta", "META"],
  ["DBS Group", "D05.SI"],
  ["OCBC", "O39.SI"],
  ["UOB", "U11.SI"],
  ["Singtel", "Z74.SI"],
  ["Sea Limited", "SE"],
  ["Grab", "GRAB"],
  ["Netflix", "NFLX"],
  ["AMD", "AMD"],
  ["Intel", "INTC"],
];

export interface HorizonPick {
  i: number;
  tag: string;
  reason: string;
}
export interface Horizon {
  label: string;
  sentiment: string;
  picks: HorizonPick[];
  risks: string[];
  signs: string[];
}

export const HORIZONS: Horizon[] = [
  {
    label: "NEXT FEW MONTHS",
    sentiment:
      "The setup: rate cuts priced in, VIX under 15, inflation cooling. Markets are risk-on but late-cycle — momentum leads, and complacency is the main risk.",
    picks: [
      {
        i: 3,
        tag: "MOMENTUM",
        reason:
          "AI capex is still accelerating and this fund owns the direct beneficiaries — NVIDIA, Microsoft, Broadcom. In an easing, risk-on environment, momentum tends to keep working over short horizons.",
      },
      {
        i: 0,
        tag: "RATE-CUT PLAY",
        reason:
          "Fed cuts usually soften the dollar and pull capital into Asian equities. The region's banks and chipmakers are the fastest responders over a few months.",
      },
      {
        i: 9,
        tag: "DRY POWDER",
        reason:
          "A VIX this low signals complacency. Keeping a cash sleeve means you can buy any dip — and money you need within a year shouldn't be fully invested anyway.",
      },
    ],
    risks: [
      "A hot CPI print that reprices rate cuts away — the fastest route to a correction from here.",
      "A VIX spike from complacent levels: crowded momentum trades unwind hardest.",
      "An earnings miss from the handful of AI leaders that carry the index's concentration.",
    ],
    signs: [
      "Aug and Sep US CPI prints vs the ~2.3% consensus path",
      "The Fed's dot plot at the September meeting",
      "NVIDIA earnings and hyperscaler capex guidance",
    ],
  },
  {
    label: "NEXT FEW YEARS",
    sentiment:
      "The setup: soft landing intact, rates normalising toward ~3%. Over 2–5 years, valuations and earnings matter more than momentum.",
    picks: [
      {
        i: 0,
        tag: "VALUATION",
        reason:
          "Asia ex-Japan trades well below US multiples while earnings keep compounding. As rates settle, that discount has historically narrowed over multi-year stretches.",
      },
      {
        i: 11,
        tag: "BALANCED CORE",
        reason:
          "With bonds paying real yields again, the 60/40 mix works as designed — equity upside with a cushion for the drawdowns you will inevitably hit across a cycle.",
      },
      {
        i: 10,
        tag: "DIVERSIFIED GROWTH",
        reason:
          "If the soft landing extends into a new cycle, a globally diversified all-equity portfolio captures it without betting on any single region or theme.",
      },
    ],
    risks: [
      "Inflation re-accelerating and forcing rates back up — the scenario that hurts stocks and bonds at once.",
      "The recession arriving late — soft landings have been declared before and unwound before.",
      "China property stress spilling into regional banks and Asia-heavy funds.",
    ],
    signs: [
      "US unemployment holding under ~4.5%",
      "The US 10Y settling into a 3.5–4% band",
      "Asian earnings revisions turning decisively positive",
    ],
  },
  {
    label: "NEXT DECADE",
    sentiment:
      "The setup: over 10+ years, cycles wash out. Secular forces — AI, Asian middle-class growth, ageing demographics — and compounding dominate everything else.",
    picks: [
      {
        i: 3,
        tag: "SECULAR: AI",
        reason:
          "Every prior platform shift — PC, internet, mobile — compounded for well over a decade. AI infrastructure and software look earlier in that curve, not later.",
      },
      {
        i: 6,
        tag: "DEMOGRAPHICS",
        reason:
          "Emerging markets have the working-age population growth and rising consumption. A decade is long enough to ride out the volatility that comes with the trade.",
      },
      {
        i: 7,
        tag: "AGEING WORLD",
        reason:
          "Healthcare demand is the most predictable line on any 10-year chart — the world gets older every year regardless of what the Fed does.",
      },
    ],
    risks: [
      "AI monetisation disappointing versus the capex poured in — the dot-com-era lesson.",
      "Geopolitics: Taiwan concentration is the single biggest tail risk inside both tech and Asia funds.",
      "Demographic dividends only pay out with reform — India has delivered; not every market will.",
    ],
    signs: [
      "AI revenue (not just capex) compounding year over year",
      "EM currency stability against the dollar",
      "US healthcare pricing reform — the sector's main policy overhang",
    ],
  },
];

export interface QuizQuestion {
  q: string;
  o: [string, number][];
}
export const QUIZ: QuizQuestion[] = [
  {
    q: "If your investments dropped 15% in a month, you would…",
    o: [
      ["Sell everything — I could not take more losses", 0],
      ["Sell some to feel safer", 1],
      ["Hold and wait it out", 2],
      ["Buy more while prices are low", 3],
    ],
  },
  {
    q: "How long before you need most of this money?",
    o: [
      ["Under 3 years", 0],
      ["3–7 years", 1],
      ["7–15 years", 2],
      ["15+ years", 3],
    ],
  },
  {
    q: "Your experience with investing is…",
    o: [
      ["None — deposits only", 0],
      ["Some funds or unit trusts", 1],
      ["Comfortable with shares and ETFs", 2],
      ["Very experienced, incl. volatile assets", 3],
    ],
  },
  {
    q: "Your income situation is…",
    o: [
      ["Irregular or uncertain", 0],
      ["Stable but tight", 1],
      ["Stable with room to save", 2],
      ["High and secure", 3],
    ],
  },
  {
    q: "Which statement fits you best?",
    o: [
      ["Protecting capital matters most", 0],
      ["Steady growth with small dips is fine", 1],
      ["Growth matters — I accept swings", 2],
      ["Maximum growth — volatility is the price", 3],
    ],
  },
  {
    q: "A 25% loss on paper would…",
    o: [
      ["Keep me up at night", 0],
      ["Worry me, but I would cope", 1],
      ["Not bother me much", 2],
      ["Feel like a buying opportunity", 3],
    ],
  },
];

export interface Profile {
  max: number;
  name: string;
  blurb: string;
  alloc: AllocSlice[];
}

export const PROFILES: Profile[] = [
  {
    max: 4,
    name: "Conservative",
    blurb:
      "You prioritise protecting what you have. Illustrative mixes at this level lean heavily on bonds and cash, trading growth for stability.",
    alloc: [
      ["Equities", 15, "#4D9FFF"],
      ["Bonds", 55, "#7A5CFF"],
      ["Cash", 25, "#2EE6C8"],
      ["Gold", 5, "#F5C558"],
    ],
  },
  {
    max: 8,
    name: "Cautious",
    blurb:
      "You want growth but with a firm safety net. A cautious mix keeps meaningful bond exposure while letting equities do some work.",
    alloc: [
      ["Equities", 30, "#4D9FFF"],
      ["Bonds", 45, "#7A5CFF"],
      ["Cash", 20, "#2EE6C8"],
      ["Gold", 5, "#F5C558"],
    ],
  },
  {
    max: 12,
    name: "Balanced",
    blurb:
      "You accept moderate swings in exchange for long-term growth. Balanced mixes split risk between equities and defensive assets.",
    alloc: [
      ["Equities", 45, "#4D9FFF"],
      ["Bonds", 35, "#7A5CFF"],
      ["Cash", 10, "#2EE6C8"],
      ["Gold", 10, "#F5C558"],
    ],
  },
  {
    max: 15,
    name: "Growth",
    blurb:
      "You are comfortable riding market cycles for higher expected returns. Growth mixes are equity-led with modest ballast.",
    alloc: [
      ["Equities", 65, "#4D9FFF"],
      ["Bonds", 20, "#7A5CFF"],
      ["Cash", 5, "#2EE6C8"],
      ["Gold", 10, "#F5C558"],
    ],
  },
  {
    max: 99,
    name: "Aggressive",
    blurb:
      "You seek maximum long-term growth and can stomach large drawdowns. Aggressive mixes are almost fully invested in equities.",
    alloc: [
      ["Equities", 80, "#4D9FFF"],
      ["Bonds", 10, "#7A5CFF"],
      ["Cash", 5, "#2EE6C8"],
      ["Gold", 5, "#F5C558"],
    ],
  },
];
