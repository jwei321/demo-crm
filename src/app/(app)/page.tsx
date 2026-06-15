import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import StatCard from "@/components/StatCard";
import Icon from "@/components/Icon";
import {
  avatarColor,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  initials,
  stageColor,
  stageLabel,
  statusColor,
  DEAL_STAGES,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { sub: userId, name } = await requireUser();
  const firstName = name.trim().split(/\s+/)[0] || "there";

  const [
    companyCount,
    contactCount,
    customerCount,
    openDeals,
    wonDeals,
    allDealsByStage,
    recentContacts,
    recentDeals,
  ] = await Promise.all([
    prisma.company.count({ where: { userId } }),
    prisma.contact.count({ where: { userId } }),
    prisma.contact.count({ where: { userId, status: "CUSTOMER" } }),
    prisma.deal.findMany({
      where: { userId, stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
      select: { value: true },
    }),
    prisma.deal.findMany({
      where: { userId, stage: "CLOSED_WON" },
      select: { value: true },
    }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { userId },
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true },
    }),
    prisma.deal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { company: true, contact: true },
    }),
  ]);

  const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

  const openStages = DEAL_STAGES.filter(
    (s) => s !== "CLOSED_WON" && s !== "CLOSED_LOST",
  );
  const stageSummary = openStages.map((stage) => {
    const row = allDealsByStage.find((r) => r.stage === stage);
    return {
      stage,
      count: row?._count._all ?? 0,
      value: Number(row?._sum.value ?? 0),
    };
  });
  const maxStageValue = Math.max(1, ...stageSummary.map((s) => s.value));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-radial p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">
            Welcome back, {firstName} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Here&apos;s what&apos;s moving today
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80">
            {formatNumber(openDeals.length)} open deals worth{" "}
            {formatCompactCurrency(pipelineValue)} are in your pipeline, and
            you&apos;ve closed {formatCompactCurrency(wonValue)} so far.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/deals"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-white/90"
            >
              View pipeline
            </Link>
            <Link
              href="/contacts"
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25"
            >
              Add a contact
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open Pipeline"
          value={formatCurrency(pipelineValue)}
          hint={`${openDeals.length} open deals`}
          icon={<Icon name="trending" />}
          trend={{ value: "Active", direction: "up" }}
        />
        <StatCard
          label="Closed Won"
          value={formatCurrency(wonValue)}
          hint="Revenue to date"
          icon={<Icon name="trophy" />}
          trend={{ value: "All time", direction: "flat" }}
        />
        <StatCard
          label="Companies"
          value={formatNumber(companyCount)}
          hint="Active accounts"
          icon={<Icon name="building" />}
        />
        <StatCard
          label="Contacts"
          value={formatNumber(contactCount)}
          hint={`${formatNumber(customerCount)} customers`}
          icon={<Icon name="users" />}
        />
      </div>

      {/* Pipeline by stage */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Open Pipeline by Stage
          </h2>
          <Link
            href="/deals"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Open board →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stageSummary.map((s) => (
            <div
              key={s.stage}
              className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-800"
            >
              <div className="flex items-center justify-between">
                <span className={`pill ${stageColor(s.stage)}`}>
                  {stageLabel(s.stage)}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {s.count}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCompactCurrency(s.value)}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(s.value / maxStageValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Contacts
            </h2>
            <Link
              href="/contacts"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentContacts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`avatar h-9 w-9 ${avatarColor(c.id)}`}
                  >
                    {initials(c.firstName, c.lastName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {c.title ?? "—"}
                      {c.company ? ` · ${c.company.name}` : ""}
                    </div>
                  </div>
                </div>
                <span className={`pill ${statusColor(c.status)} whitespace-nowrap`}>
                  {c.status}
                </span>
              </li>
            ))}
            {recentContacts.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                No contacts yet.
              </li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Deals
            </h2>
            <Link
              href="/deals"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              View pipeline →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDeals.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                    {d.title}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {d.company?.name ?? "—"} ·{" "}
                    {d.expectedCloseDate
                      ? `Closes ${formatDate(d.expectedCloseDate)}`
                      : d.closedAt
                        ? `Closed ${formatDate(d.closedAt)}`
                        : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatCurrency(Number(d.value))}
                  </span>
                  <span className={`pill ${stageColor(d.stage)}`}>
                    {stageLabel(d.stage)}
                  </span>
                </div>
              </li>
            ))}
            {recentDeals.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                No deals yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
