import fs from "node:fs";
import path from "node:path";
import type { MarketData } from "./types";

// Reads the weekly-refreshed dataset. The file is updated by the weekly GitHub
// Action (scripts/update-market-data.mjs) and baked into each deploy.
export function getMarketData(): MarketData {
  const file = path.join(process.cwd(), "data", "market.json");
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw) as MarketData;
}
