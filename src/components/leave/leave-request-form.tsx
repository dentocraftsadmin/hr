"use client";

import { useRef, useState, useTransition } from "react";
import { createLeaveRequest } from "@/server/actions/leave";

type LeaveType = { id: string; name: string };

export function LeaveRequestForm({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createLeaveRequest(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-medium text-foreground">Request leave</h2>
      <select name="leave_type_id" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
        <option value="">Leave type</option>
        {leaveTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <label className="flex-1 text-sm text-muted">
          From
          <input type="date" name="from_date" required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
        <label className="flex-1 text-sm text-muted">
          To
          <input type="date" name="to_date" required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" name="is_half_day" />
        Half day
      </label>
      <textarea
        name="reason"
        placeholder="Reason (optional)"
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={isPending} className="w-full rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50">
        {isPending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
