"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatDate } from "@/lib/format";

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  priority: Priority;
  createdAt: string;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
};

const PRIORITY_COLORS: Record<Priority, string> = {
  HIGH: "text-rose-600 dark:text-rose-400",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  LOW: "text-slate-400 dark:text-slate-500",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  LOW: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

type FormState = { id?: string; title: string; dueDate: string; priority: Priority; contactId: string; dealId: string };
const EMPTY: FormState = { title: "", dueDate: "", priority: "MEDIUM", contactId: "", dealId: "" };

export default function TasksView({
  initialTasks,
  contacts,
  deals,
}: {
  initialTasks: Task[];
  contacts: { id: string; firstName: string; lastName: string }[];
  deals: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<"open" | "completed" | "overdue">("open");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();

  const filtered = useMemo(() => {
    switch (filter) {
      case "open": return tasks.filter((t) => !t.completed);
      case "completed": return tasks.filter((t) => t.completed);
      case "overdue": return tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < now);
    }
  }, [tasks, filter]);

  const counts = {
    open: tasks.filter((t) => !t.completed).length,
    overdue: tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < now).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  async function toggleTask(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed } : t)));
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const url = form.id ? `/api/tasks/${form.id}` : "/api/tasks";
    const method = form.id ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        dueDate: form.dueDate || null,
        priority: form.priority,
        contactId: form.contactId || null,
        dealId: form.dealId || null,
      }),
    });
    if (res.ok) {
      const saved = await res.json();
      const normalized = { ...saved, dueDate: saved.dueDate ? new Date(saved.dueDate).toISOString() : null };
      setTasks((prev) => form.id ? prev.map((t) => (t.id === saved.id ? normalized : t)) : [normalized, ...prev]);
      setOpen(false);
      router.refresh();
    }
    setSubmitting(false);
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${counts.open} open · ${counts.overdue} overdue · ${counts.completed} done`}
        actions={
          <button className="btn-primary" onClick={() => { setForm(EMPTY); setOpen(true); }}>
            + New Task
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="inline-flex rounded-xl bg-slate-100 p-1 mb-4 dark:bg-slate-800">
        {(["open", "overdue", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${filter === f ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500 hover:text-slate-800 dark:text-slate-400"}`}
          >
            {f} {counts[f] > 0 && <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs dark:bg-slate-600">{counts[f]}</span>}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {filter === "open" ? "No open tasks. Add one above." : filter === "overdue" ? "No overdue tasks. 🎉" : "No completed tasks yet."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((t) => {
              const isOverdue = !t.completed && t.dueDate && new Date(t.dueDate) < now;
              return (
                <li key={t.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={(e) => toggleTask(t.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${t.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>
                      {t.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {t.dueDate && (
                        <span className={isOverdue ? "font-semibold text-rose-500" : ""}>
                          {isOverdue ? "Overdue · " : "Due "}{formatDate(t.dueDate)}
                        </span>
                      )}
                      {t.contact && <span className="text-brand-600 dark:text-brand-400">{t.contact.firstName} {t.contact.lastName}</span>}
                      {t.deal && <span className="text-brand-600 dark:text-brand-400">{t.deal.title}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`pill ring-1 ring-inset ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span>
                    <button onClick={() => { setForm({ id: t.id, title: t.title, dueDate: t.dueDate?.slice(0, 10) ?? "", priority: t.priority, contactId: t.contact?.id ?? "", dealId: t.deal?.id ?? "" }); setOpen(true); }} className="text-xs text-slate-400 hover:text-brand-600">Edit</button>
                    <button onClick={() => deleteTask(t.id)} className="text-xs text-slate-400 hover:text-rose-500">Delete</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Edit Task" : "New Task"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" required placeholder="e.g. Follow up on proposal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Due date</label>
              <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact</label>
              <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                <option value="">— None —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Deal</label>
              <select className="input" value={form.dealId} onChange={(e) => setForm({ ...form, dealId: e.target.value })}>
                <option value="">— None —</option>
                {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving…" : form.id ? "Save" : "Add task"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
