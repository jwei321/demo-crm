"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format";

type Priority = "LOW" | "MEDIUM" | "HIGH";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  priority: Priority;
  contact: { id: string; firstName: string; lastName: string } | null;
  deal: { id: string; title: string } | null;
};

const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-amber-500",
  HIGH: "text-rose-500",
};

interface Props {
  contactId?: string;
  dealId?: string;
  label?: string;
}

export default function TaskList({ contactId, dealId, label = "Tasks" }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ completed: "false" });
  if (contactId) params.set("contactId", contactId);
  if (dealId) params.set("dealId", dealId);

  useEffect(() => {
    fetch(`/api/tasks?${params}`)
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, dealId]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate: dueDate || null, priority, contactId, dealId }),
    });
    if (res.ok) {
      const created = await res.json();
      setTasks((prev) => [created, ...prev]);
      setTitle("");
      setDueDate("");
      setPriority("MEDIUM");
      setAdding(false);
    }
    setSubmitting(false);
  }

  async function toggleTask(id: string, completed: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed);
  const upcoming = tasks.filter((t) => !overdue.includes(t));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
          {adding ? "Cancel" : "+ Add task"}
        </button>
      </div>

      {adding && (
        <form onSubmit={addTask} className="card p-3 space-y-2">
          <input className="input" placeholder="Task title…" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="flex gap-2">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="btn-primary text-xs" disabled={submitting}>{submitting ? "Adding…" : "Add"}</button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-slate-400">Loading…</p>}

      {!loading && tasks.length === 0 && !adding && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No open tasks.</p>
      )}

      {overdue.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-1">Overdue</p>
          {overdue.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
        </div>
      )}

      {upcoming.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string, completed: boolean) => void; onDelete: (id: string) => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div className="group flex items-start gap-2.5 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.dueDate && (
            <span className={`text-xs ${isOverdue ? "text-rose-500 font-medium" : "text-slate-400"}`}>
              Due {formatDate(task.dueDate)}
            </span>
          )}
          <span className={`text-xs font-medium ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition text-xs">✕</button>
    </div>
  );
}
