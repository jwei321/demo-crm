"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Could not sign in.");
      }
      // Full reload so middleware + server layout pick up the new session.
      window.location.assign("/");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  function useDemo() {
    setEmail("demo@relay.app");
    setPassword("relay1234");
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Welcome back
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sign in to your Relay workspace.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Forgot password?
            </Link>
          </div>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button
        onClick={useDemo}
        className="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400"
      >
        Use demo account (demo@relay.app)
      </button>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New to Relay?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
