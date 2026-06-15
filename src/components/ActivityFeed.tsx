"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format";

type ActivityType = "NOTE" | "CALL" | "EMAIL" | "MEETING";

type Activity = {
  id: string;
  type: ActivityType;
  content: string;
  occurredAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
};

const TYPE_META: Record<ActivityType, { label: string; icon: string; color: string }> = {
  NOTE: { label: "Note", icon: "M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  CALL: { label: "Call", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.5 12.5 19.79 19.79 0 0 1 1.17 4.18 2 2 0 0 1 3.15 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z", color: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" },
  EMAIL: { label: "Email", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6", color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  MEETING: { label: "Meeting", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
};

interface Props {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  label?: string;
}

export default function ActivityFeed({ contactId, dealId, companyId, label = "Activity" }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [type, setType] = useState<ActivityType>("NOTE");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams();
  if (contactId) params.set("contactId", contactId);
  if (dealId) params.set("dealId", dealId);
  if (companyId) params.set("companyId", companyId);

  useEffect(() => {
    fetch(`/api/activities?${params}`)
      .then((r) => r.json())
      .then((data) => { setActivities(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, dealId, companyId]);

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, contactId, dealId, companyId }),
    });
    if (res.ok) {
      const created = await res.json();
      setActivities((prev) => [created, ...prev]);
      setContent("");
    }
    setSubmitting(false);
  }

  async function deleteActivity(id: string) {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h3>

      {/* Log form */}
      <form onSubmit={addActivity} className="card p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(TYPE_META) as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${type === t ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
            >
              {TYPE_META[t].label}
            </button>
          ))}
        </div>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder={`Log a ${TYPE_META[type].label.toLowerCase()}…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
            {submitting ? "Saving…" : "Log activity"}
          </button>
        </div>
      </form>

      {/* Timeline */}
      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {!loading && activities.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activities logged yet.</p>
      )}
      <div className="space-y-3">
        {activities.map((a) => {
          const meta = TYPE_META[a.type];
          return (
            <div key={a.id} className="flex gap-3">
              <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.color}`}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d={meta.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{meta.label}</span>
                    <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(a.occurredAt)}</span>
                    {a.contact && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400">{a.contact.firstName} {a.contact.lastName}</span>}
                    {a.deal && <span className="ml-2 text-xs text-brand-600 dark:text-brand-400">{a.deal.title}</span>}
                  </div>
                  <button onClick={() => deleteActivity(a.id)} className="text-xs text-slate-400 hover:text-rose-500 transition shrink-0">Delete</button>
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{a.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
