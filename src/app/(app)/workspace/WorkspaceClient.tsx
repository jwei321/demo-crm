"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

type Role = "OWNER" | "ADMIN" | "MEMBER";

interface Member {
  userId: string;
  role: Role;
  name: string;
  email: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  members: Member[];
  invites: Invite[];
}

const ROLE_BADGE: Record<Role, string> = {
  OWNER: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/30",
  ADMIN: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  MEMBER: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function WorkspaceClient({
  workspace,
  currentUserId,
  canInvite,
}: {
  workspace: WorkspaceData;
  currentUserId: string;
  canInvite: boolean;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [invites, setInvites] = useState<Invite[]>(workspace.invites);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      setInviteMsg({ ok: true, text: `Invite sent to ${inviteEmail}` });
      setInvites((prev) => [
        { id: data.inviteId ?? crypto.randomUUID(), email: inviteEmail, role: inviteRole, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
        ...prev.filter((i) => i.email !== inviteEmail),
      ]);
      setInviteEmail("");
    } catch (err: any) {
      setInviteMsg({ ok: false, text: err.message });
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace"
        subtitle={`${workspace.name} · ${workspace.members.length} member${workspace.members.length !== 1 ? "s" : ""}`}
      />

      {/* Workspace Info */}
      <div className="card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
          Workspace Info
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{workspace.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Slug</dt>
            <dd className="font-mono text-slate-700 dark:text-slate-300">{workspace.slug}</dd>
          </div>
        </dl>
      </div>

      {/* Members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Members ({workspace.members.length})
          </h2>
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {workspace.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-5 py-3">
              <div className="avatar h-9 w-9 bg-brand-gradient shrink-0">
                {initialsFromName(m.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {m.name}
                    {m.userId === currentUserId && (
                      <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.email}</p>
              </div>
              <span className={`pill ring-1 ring-inset ${ROLE_BADGE[m.role]}`}>{m.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invite */}
      {canInvite && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Invite a teammate
          </h2>
          <form onSubmit={sendInvite} className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[220px]"
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="input w-36"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button type="submit" className="btn-primary" disabled={inviting}>
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </form>
          {inviteMsg && (
            <p className={`mt-2 text-sm ${inviteMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {inviteMsg.text}
            </p>
          )}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Pending Invites ({invites.length})
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{inv.email}</p>
                  <p className="text-xs text-slate-400">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`pill ring-1 ring-inset ${ROLE_BADGE[inv.role as Role] ?? ROLE_BADGE.MEMBER}`}>
                  {inv.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
