"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import Icon from "@/components/Icon";
import {
  DEAL_STAGES,
  DealStage,
  avatarColor,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  initials,
  stageAccent,
  stageColor,
  stageLabel,
} from "@/lib/format";

type Deal = {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  expectedCloseDate: string | null;
  closedAt: string | null;
  companyId: string | null;
  contactId: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
};

type CompanyOption = { id: string; name: string };
type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyId: string | null;
};

type FormState = {
  id?: string;
  title: string;
  value: string;
  stage: DealStage;
  companyId: string;
  contactId: string;
  expectedCloseDate: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  value: "",
  stage: "PROSPECTING",
  companyId: "",
  contactId: "",
  expectedCloseDate: "",
};

export default function DealsView({
  initialDeals,
  companies,
  contacts,
}: {
  initialDeals: Deal[];
  companies: CompanyOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [view, setView] = useState<"board" | "list">("board");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  const byStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = {
      PROSPECTING: [],
      QUALIFICATION: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      CLOSED_WON: [],
      CLOSED_LOST: [],
    };
    deals.forEach((d) => map[d.stage]?.push(d));
    return map;
  }, [deals]);

  const openValue = deals
    .filter((d) => d.stage !== "CLOSED_WON" && d.stage !== "CLOSED_LOST")
    .reduce((s, d) => s + d.value, 0);
  const wonValue = deals
    .filter((d) => d.stage === "CLOSED_WON")
    .reduce((s, d) => s + d.value, 0);

  function openCreate(stage?: DealStage) {
    setForm({ ...EMPTY_FORM, stage: stage ?? "PROSPECTING" });
    setError(null);
    setOpen(true);
  }

  function openEdit(d: Deal) {
    setForm({
      id: d.id,
      title: d.title,
      value: String(d.value),
      stage: d.stage,
      companyId: d.companyId ?? "",
      contactId: d.contactId ?? "",
      expectedCloseDate: d.expectedCloseDate
        ? d.expectedCloseDate.slice(0, 10)
        : "",
    });
    setError(null);
    setOpen(true);
  }

  async function moveStage(id: string, stage: DealStage) {
    const prev = deals;
    setDeals((cur) =>
      cur.map((d) =>
        d.id === id
          ? {
              ...d,
              stage,
              closedAt:
                stage === "CLOSED_WON" || stage === "CLOSED_LOST"
                  ? new Date().toISOString()
                  : null,
            }
          : d,
      ),
    );
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setDeals(prev); // revert on failure
      alert("Failed to move deal");
      return;
    }
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = form.id ? `/api/deals/${form.id}` : "/api/deals";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          value: form.value ? Number(form.value) : 0,
          stage: form.stage,
          companyId: form.companyId || null,
          contactId: form.contactId || null,
          expectedCloseDate: form.expectedCloseDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Request failed");
      }
      const saved = await res.json();
      const normalized: Deal = {
        ...saved,
        value: Number(saved.value),
        expectedCloseDate: saved.expectedCloseDate
          ? new Date(saved.expectedCloseDate).toISOString()
          : null,
        closedAt: saved.closedAt
          ? new Date(saved.closedAt).toISOString()
          : null,
      };
      setDeals((cur) =>
        form.id
          ? cur.map((d) => (d.id === normalized.id ? normalized : d))
          : [normalized, ...cur],
      );
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal?")) return;
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeals((cur) => cur.filter((d) => d.id !== id));
      router.refresh();
    } else {
      alert("Failed to delete deal");
    }
  }

  const contactOptions = form.companyId
    ? contacts.filter((c) => c.companyId === form.companyId)
    : contacts;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle={`${formatCurrency(openValue)} open · ${formatCurrency(wonValue)} won · ${deals.length} deals`}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(["board", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                    view === v
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => openCreate()}>
              <Icon name="plus" className="h-4 w-4" />
              New Deal
            </button>
          </div>
        }
      />

      {view === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const items = byStage[stage];
            const total = items.reduce((s, d) => s + d.value, 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={() => {
                  if (dragId) moveStage(dragId, stage);
                  setDragId(null);
                  setOverStage(null);
                }}
                className={`flex w-72 shrink-0 flex-col rounded-2xl bg-slate-50 ring-1 transition dark:bg-slate-900/40 ${
                  overStage === stage
                    ? "ring-2 ring-brand-400"
                    : "ring-slate-200/70 dark:ring-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stageAccent(stage)}`} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {stageLabel(stage)}
                    </span>
                    <span className="rounded-full bg-slate-200 px-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {items.length}
                    </span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                    {formatCompactCurrency(total)}
                  </span>
                </div>

                <div className="flex-1 space-y-2 p-2">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => openEdit(d)}
                      className={`group cursor-pointer rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-200/70 transition hover:ring-brand-300 dark:bg-slate-800 dark:ring-slate-700 ${
                        dragId === d.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                          {d.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(d.id);
                          }}
                          className="opacity-0 transition group-hover:opacity-100"
                          aria-label="Delete deal"
                        >
                          <svg
                            className="h-4 w-4 text-slate-400 hover:text-rose-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M6 6l12 12M18 6L6 18"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                      {d.company && (
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {d.company.name}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatCurrency(d.value)}
                        </span>
                        {d.contact && (
                          <span
                            className={`avatar h-6 w-6 text-[10px] ${avatarColor(d.contact.id)}`}
                            title={`${d.contact.firstName} ${d.contact.lastName}`}
                          >
                            {initials(d.contact.firstName, d.contact.lastName)}
                          </span>
                        )}
                      </div>
                      {d.expectedCloseDate && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Closes {formatDate(d.expectedCloseDate)}
                        </p>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => openCreate(stage)}
                    className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400"
                  >
                    + Add deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                <tr>
                  <th className="table-th">Deal</th>
                  <th className="table-th">Company</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Value</th>
                  <th className="table-th">Stage</th>
                  <th className="table-th">Close date</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deals.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="table-td font-medium text-slate-900 dark:text-slate-100">
                      {d.title}
                    </td>
                    <td className="table-td">{d.company?.name ?? "—"}</td>
                    <td className="table-td">
                      {d.contact
                        ? `${d.contact.firstName} ${d.contact.lastName}`
                        : "—"}
                    </td>
                    <td className="table-td tabular-nums">
                      {formatCurrency(d.value)}
                    </td>
                    <td className="table-td">
                      <span className={`pill ${stageColor(d.stage)}`}>
                        {stageLabel(d.stage)}
                      </span>
                    </td>
                    <td className="table-td">
                      {d.expectedCloseDate
                        ? formatDate(d.expectedCloseDate)
                        : d.closedAt
                          ? formatDate(d.closedAt)
                          : "—"}
                    </td>
                    <td className="table-td whitespace-nowrap text-right">
                      <button
                        className="mr-3 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        onClick={() => remove(d.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {deals.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      No deals yet. Create your first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? "Edit Deal" : "New Deal"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Deal title</label>
            <input
              className="input"
              required
              placeholder="e.g. Annual License — Acme Corp"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Value (USD)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                className="input"
                value={form.stage}
                onChange={(e) =>
                  setForm({ ...form, stage: e.target.value as DealStage })
                }
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <select
                className="input"
                value={form.companyId}
                onChange={(e) =>
                  setForm({ ...form, companyId: e.target.value, contactId: "" })
                }
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contact</label>
              <select
                className="input"
                value={form.contactId}
                onChange={(e) =>
                  setForm({ ...form, contactId: e.target.value })
                }
              >
                <option value="">— None —</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Expected close date</label>
            <input
              className="input"
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) =>
                setForm({ ...form, expectedCloseDate: e.target.value })
              }
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? "Saving…"
                : form.id
                  ? "Save changes"
                  : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
