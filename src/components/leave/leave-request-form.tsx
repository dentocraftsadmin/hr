"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Info } from "lucide-react";
import { createLeaveRequest } from "@/server/actions/leave";
import { assessNotice, describeNotice } from "@/lib/data/leave-notice";

type LeaveType = { id: string; name: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LeaveRequestForm({
  leaveTypes,
  workingDays,
  holidayDates,
  noticeDays,
}: {
  leaveTypes: LeaveType[];
  workingDays: number[];
  holidayDates: string[];
  noticeDays: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const notice = useMemo(() => {
    if (!fromDate) return null;
    return assessNotice(todayIso(), fromDate, workingDays, holidayDates, noticeDays);
  }, [fromDate, workingDays, holidayDates, noticeDays]);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createLeaveRequest(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setFromDate("");
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-foreground">Request leave</h2>
        <Link href="/rules#leave" className="text-xs text-muted hover:text-primary-strong hover:underline flex items-center gap-1">
          <Info className="h-3 w-3" /> How this is scored
        </Link>
      </div>
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
          <input
            type="date"
            name="from_date"
            required
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
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

      {notice && notice.status !== "not_required" && (
        <p
          className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs ${
            notice.status === "sufficient" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {describeNotice(notice)}
        </p>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={isPending} className="w-full rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50">
        {isPending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
