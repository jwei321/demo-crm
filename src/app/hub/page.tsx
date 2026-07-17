import { getMarketData } from "@/lib/market/data";
import MarketHub from "./MarketHub";

// Re-baked on every deploy; the weekly Action commits fresh data which triggers
// a redeploy. Rendered statically from the committed JSON.
export const dynamic = "force-static";

export default function HubPage() {
  const data = getMarketData();
  return <MarketHub data={data} />;
}
