// Types for the Market & Planning Hub data layer.
// The numeric/"live" datasets live in data/market.json and are refreshed weekly
// by scripts/update-market-data.mjs. Editorial copy lives in ./static.ts.

export type Timeframe = "1W" | "1M" | "3M" | "YTD" | "1Y";
export type SectorTimeframe = Timeframe | "5Y" | "10Y" | "MAX";

export interface Instrument {
  id: string;
  name: string;
  full: string;
  val: string;
  color: string;
  chg: Record<Timeframe, number>;
  data: number[];
}

export interface Sector {
  id: string;
  name: string;
  label: string;
  w: number;
  x: number;
  y: number;
  chg: Record<SectorTimeframe, number>;
}

export interface MacroReading {
  name: string;
  val: string;
  chg: number;
  chgTxt: string;
  good: boolean;
  flag: string;
  spark: number[];
  note: string;
}

export type AllocSlice = [string, number, string];
export type Holding = [string, number];
export type GeoSlice = [string, number];
export type FundReturn = [string, number];

export interface Fund {
  name: string;
  short: string;
  risk: string;
  lvl: 0 | 1 | 2;
  nav: string;
  size: string;
  ytd: number;
  about: string;
  commentary: string;
  alloc: AllocSlice[];
  holdings: Holding[];
  geo: GeoSlice[];
  returns: FundReturn[];
}

export interface MarketMeta {
  updatedISO: string;
  stamp: string;
  weekOf: string;
  generatedBy: "seed" | "live" | "fallback" | string;
  sources: string[];
}

export interface MarketData {
  meta: MarketMeta;
  instruments: Instrument[];
  sectors: Sector[];
  macro: MacroReading[];
  funds: Fund[];
  fundFacts: Record<string, string[]>;
}
