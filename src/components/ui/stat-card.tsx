import type { LucideIcon } from "lucide-react";

type Tone = "neutral" | "warning" | "danger" | "success";

const toneStyles: Record<Tone, { text: string; iconBg: string; iconColor: string }> = {
  neutral: { text: "text-foreground", iconBg: "bg-primary-soft", iconColor: "text-primary-strong" },
  success: { text: "text-success", iconBg: "bg-success-soft", iconColor: "text-success" },
  warning: { text: "text-warning", iconBg: "bg-warning-soft", iconColor: "text-warning" },
  danger: { text: "text-danger", iconBg: "bg-danger-soft", iconColor: "text-danger" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const t = toneStyles[tone];
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${t.text}`}>{value}</p>
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${t.iconBg}`}>
          <Icon className={`h-4 w-4 ${t.iconColor}`} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
