"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/deals": "Pipeline",
  "/contacts": "Contacts",
  "/companies": "Companies",
  "/analytics": "Analytics",
};

export default function TopBar() {
  const pathname = usePathname();
  const section =
    Object.entries(TITLES).find(([href]) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    )?.[1] ?? "Relay";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-5 sm:px-6">
        {/* Mobile brand */}
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <Logo className="h-8 w-8" />
          <span className="font-bold tracking-tight">Relay</span>
        </Link>

        <div className="hidden items-center gap-2 text-sm text-slate-500 md:flex dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">Relay</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {section}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              className="input w-56 pl-9"
              placeholder="Search Relay…"
              aria-label="Search"
            />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-500/30">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
            Live demo
          </span>
        </div>
      </div>
    </header>
  );
}
