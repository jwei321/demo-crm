"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "?";
}

const links = [
  { href: "/", label: "Dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/deals", label: "Pipeline", icon: "M3 3v18h18M7 15l3-3 3 3 5-6" },
  { href: "/contacts", label: "Contacts", icon: "M16 14a4 4 0 1 0-8 0M4 20a8 8 0 1 1 16 0" },
  { href: "/companies", label: "Companies", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" },
  { href: "/tasks", label: "Tasks", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/analytics", label: "Analytics", icon: "M3 3v18h18M7 14l4-4 4 4 5-5" },
  { href: "/workspace", label: "Workspace", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

export default function Sidebar({
  user,
}: {
  user: { name: string; email: string };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-200 bg-white/80 backdrop-blur dark:bg-slate-900/60 dark:border-slate-800">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Relay
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Northwind Demo Co.
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Workspace
        </div>
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 dark:bg-brand-400" />
              )}
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-800">
        <ThemeToggle />
      </div>

      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="avatar h-9 w-9 bg-brand-gradient">
            {initialsFromName(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.name}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
