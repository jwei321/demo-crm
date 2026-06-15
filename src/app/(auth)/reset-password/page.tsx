"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    if (res.ok) {
      window.location.assign("/");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Set a new password</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a strong password for your Relay account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" />
        </div>
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">{error}</div>}
        <button type="submit" className="btn-primary w-full" disabled={loading || !token}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
