import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market & Planning Hub",
  description:
    "A live market intelligence and financial-planning hub — markets, sectors, macro, funds, outlook and planning tools. Data refreshes weekly.",
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrument.variable} ${plexMono.variable}`}>{children}</div>
  );
}
