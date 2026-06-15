import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDate, stageColor, stageLabel, statusColor } from "@/lib/format";
import ActivityFeed from "@/components/ActivityFeed";
import TaskList from "@/components/TaskList";
import DealDetailClient from "./DealDetailClient";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const { sub: userId } = await requireUser();

  const deal = await prisma.deal.findFirst({
    where: { id: params.id, userId },
    include: {
      company: true,
      contact: true,
    },
  });

  if (!deal) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <a href="/deals" className="hover:text-brand-600">Pipeline</a>
            <span>›</span>
            <span>{stageLabel(deal.stage)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{deal.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className={`pill ${stageColor(deal.stage)}`}>{stageLabel(deal.stage)}</span>
            <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(Number(deal.value))}</span>
            {deal.expectedCloseDate && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Closes {formatDate(deal.expectedCloseDate)}
              </span>
            )}
          </div>
        </div>
        <DealDetailClient dealId={deal.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left col: details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Account */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Account</h2>
            {deal.company ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{deal.company.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deal.company.industry}</p>
                {deal.company.website && (
                  <a href={deal.company.website} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 truncate">
                    {deal.company.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No company linked</p>
            )}
          </div>

          {/* Contact */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Primary Contact</h2>
            {deal.contact ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {deal.contact.firstName} {deal.contact.lastName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deal.contact.title ?? "—"}</p>
                <a href={`mailto:${deal.contact.email}`} className="mt-1 block text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 truncate">
                  {deal.contact.email}
                </a>
                <span className={`mt-2 pill ${statusColor(deal.contact.status)}`}>{deal.contact.status}</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No contact linked</p>
            )}
          </div>

          {/* Metadata */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-900 dark:text-slate-100">{formatDate(deal.createdAt)}</dd>
              </div>
              {deal.closedAt && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Closed</dt>
                  <dd className="text-slate-900 dark:text-slate-100">{formatDate(deal.closedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-slate-900 dark:text-slate-100">{formatDate(deal.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Tasks */}
          <div className="card p-5">
            <TaskList dealId={deal.id} />
          </div>
        </div>

        {/* Right col: timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Assistant */}
          <DealDetailClient dealId={deal.id} showAI />

          {/* Activity */}
          <div className="card p-5">
            <ActivityFeed dealId={deal.id} label="Activity & Notes" />
          </div>
        </div>
      </div>
    </div>
  );
}
