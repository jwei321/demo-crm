import { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  hint,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  trend?: { value: string; direction: "up" | "down" | "flat" };
}) {
  const trendColor =
    trend?.direction === "up"
      ? "text-accent-600 dark:text-accent-400"
      : trend?.direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-slate-500 dark:text-slate-400";

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </div>
        {icon && (
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${trendColor}`}>
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "→"}
            {trend.value}
          </span>
        )}
        {hint && <span className="text-slate-500 dark:text-slate-400">{hint}</span>}
      </div>
    </div>
  );
}
