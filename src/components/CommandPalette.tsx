"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type ResultItem = {
  id: string;
  label: string;
  sub: string;
  type: "contact" | "company" | "deal";
};

type Results = {
  contacts: ResultItem[];
  companies: ResultItem[];
  deals: ResultItem[];
};

const HREF = {
  contact: "/contacts",
  company: "/companies",
  deal: "/deals",
};

const ICON_PATH = {
  contact: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0",
  company: "M3 21h18M5 21V7l7-4 7 4v14",
  deal: "M3 3v18h18M7 15l3-3 3 3 5-6",
};

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>({ contacts: [], companies: [], deals: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const allItems = [...results.contacts, ...results.companies, ...results.deals];

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults({ contacts: [], companies: [], deals: [] });
    setSelected(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ contacts: [], companies: [], deals: [] });
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: abortRef.current.signal })
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setSelected(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  function navigate(item: ResultItem) {
    router.push(`${HREF[item.type]}?highlight=${item.id}`);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && allItems[selected]) {
      navigate(allItems[selected]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl animate-fade-in">
        <div className="card overflow-hidden shadow-lift">
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
            <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              className="flex-1 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent dark:text-slate-100"
              placeholder="Search contacts, companies, deals…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            )}
            <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 sm:block">
              ESC
            </kbd>
          </div>

          {allItems.length === 0 && query.length >= 2 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {allItems.length === 0 && query.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Type at least 2 characters to search
            </div>
          )}

          {allItems.length > 0 && (
            <ul className="max-h-72 overflow-y-auto py-2">
              {(["contacts", "companies", "deals"] as const).map((section) => {
                const items = results[section];
                if (!items.length) return null;
                return (
                  <li key={section}>
                    <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {section}
                    </div>
                    {items.map((item) => {
                      const globalIdx = allItems.indexOf(item);
                      const isSelected = globalIdx === selected;
                      return (
                        <button
                          key={item.id}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                            isSelected ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                          onClick={() => navigate(item)}
                          onMouseEnter={() => setSelected(globalIdx)}
                        >
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isSelected ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                              <path d={ICON_PATH[item.type]} />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</div>
                            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.sub}</div>
                          </div>
                          {isSelected && (
                            <kbd className="ml-auto shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800">
            <span><kbd className="rounded border border-slate-200 bg-slate-100 px-1 dark:border-slate-700 dark:bg-slate-800">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border border-slate-200 bg-slate-100 px-1 dark:border-slate-700 dark:bg-slate-800">↵</kbd> open</span>
            <span><kbd className="rounded border border-slate-200 bg-slate-100 px-1 dark:border-slate-700 dark:bg-slate-800">ESC</kbd> close</span>
            <span className="ml-auto">⌘K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
