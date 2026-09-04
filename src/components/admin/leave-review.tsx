"use client";

import { useState, useTransition } from "react";
import { reviewLeaveRequest } from "@/server/actions/leave";

type Request = {
  id: string;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  reason: string | null;
  status: string;
  employee: { full_name: string } | { full_name: string }[] | null;
  leave_type: { name: string } | { name: string }[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function LeaveReviewList({ requests }: { requests: Request[] }) {
  return (
    <ul className="space-y-2">
      {requests.length === 0 && <p className="text-sm text-muted">Nothing pending.</p>}
      {requests.map((r) => (
        <ReviewRow key={r.id} request={r} />
      ))}
    </ul>
  );
}

function ReviewRow({ request }: { request: Request }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const employee = one(request.employee);
  const type = one(request.leave_type);

  function act(status: "approved" | "rejected") {
    const formData = new FormData();
    formData.set("id", request.id);
    formData.set("status", status);
    formData.set("admin_note", note);
    startTransition(async () => {
      await reviewLeaveRequest(formData);
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <p className="font-medium text-foreground">{employee?.full_name ?? "—"}</p>
      <p className="text-sm text-muted">
        {type?.name ?? "Leave"} · {request.from_date}
        {request.to_date !== request.from_date ? ` – ${request.to_date}` : ""}
        {request.is_half_day ? " (half day)" : ""}
      </p>
      {request.reason && <p className="mt-1 text-sm text-muted">&ldquo;{request.reason}&rdquo;</p>}
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => act("approved")}
          disabled={isPending}
          className="flex-1 rounded-lg bg-primary text-white text-sm font-medium py-2 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={() => act("rejected")}
          disabled={isPending}
          className="flex-1 rounded-lg border border-border text-foreground text-sm font-medium py-2 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </li>
  );
}
