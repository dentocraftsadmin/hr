"use client";

import { useTransition } from "react";
import { cancelLeaveRequest } from "@/server/actions/leave";

type Request = {
  id: string;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  status: string;
  admin_note: string | null;
  leave_type: { name: string } | { name: string }[] | null;
};

function typeName(v: Request["leave_type"]): string {
  const t = Array.isArray(v) ? v[0] : v;
  return t?.name ?? "Leave";
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-primary-soft text-primary-strong",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-background text-muted",
};

export function LeaveHistory({ requests }: { requests: Request[] }) {
  const [isPending, startTransition] = useTransition();

  function onCancel(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await cancelLeaveRequest(formData);
    });
  }

  if (requests.length === 0) {
    return <p className="text-sm text-muted">No leave requests yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li key={r.id} className="rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {typeName(r.leave_type)} · {r.from_date}
              {r.to_date !== r.from_date ? ` – ${r.to_date}` : ""}
              {r.is_half_day ? " (half day)" : ""}
            </p>
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[r.status] ?? ""}`}>
              {r.status}
            </span>
          </div>
          {r.admin_note && <p className="mt-1 text-xs text-muted">HR note: {r.admin_note}</p>}
          {r.status === "pending" && (
            <button
              onClick={() => onCancel(r.id)}
              disabled={isPending}
              className="mt-2 text-xs font-medium text-muted underline"
            >
              Withdraw
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
