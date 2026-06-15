"use client";

import { useState } from "react";

interface Props {
  dealId: string;
  showAI?: boolean;
}

export default function DealDetailClient({ dealId, showAI = false }: Props) {
  const [aiResult, setAiResult] = useState<{ summary: string; nextStep: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function getAiInsight() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI service unavailable");
      setAiResult(data);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  // When used as header actions (showAI = false), just show a button to open detail
  if (!showAI) {
    return (
      <a href={`/deals/${dealId}`} className="btn-secondary text-sm">View details</a>
    );
  }

  // AI panel
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6z" />
              <path d="M12 8v4l3 3" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Deal Assistant</h2>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30">
            Powered by Claude
          </span>
        </div>
        <button
          onClick={getAiInsight}
          disabled={aiLoading}
          className="btn-primary text-xs"
        >
          {aiLoading ? "Analysing…" : aiResult ? "Refresh" : "Get insight"}
        </button>
      </div>

      {aiError && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {aiError}
        </div>
      )}

      {!aiResult && !aiLoading && !aiError && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click &ldquo;Get insight&rdquo; to get an AI-powered summary and next-step recommendation for this deal.
        </p>
      )}

      {aiLoading && (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Analysing deal context…
        </div>
      )}

      {aiResult && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Summary</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{aiResult.summary}</p>
          </div>
          <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-1">Recommended next step</p>
            <p className="text-sm font-medium text-brand-900 dark:text-brand-200">{aiResult.nextStep}</p>
          </div>
        </div>
      )}
    </div>
  );
}
