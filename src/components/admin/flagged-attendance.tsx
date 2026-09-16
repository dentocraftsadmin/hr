"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { correctAttendanceDay } from "@/server/actions/attendance-corrections";
import { EmptyState } from "@/components/ui/empty-state";
import { LocationMapLink } from "@/components/shared/location-map-link";
import { formatPersonName } from "@/lib/format/name";

type LocationEvent = { latitude: number; longitude: number } | { latitude: number; longitude: number }[] | null;

type Row = {
  id: string;
  date: string;
  day_type: string;
  hours_worked: number | null;
  employee: { full_name: string } | { full_name: string }[] | null;
  punch_in?: LocationEvent;
  punch_out?: LocationEvent;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const DAY_TYPES = ["full_day", "half_day", "absent", "on_leave", "holiday", "week_off"];

export function FlaggedAttendanceList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing needs correction"
        description="Incomplete punches and flagged attendance days will show up here."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <FlaggedRow key={r.id} row={r} />
      ))}
    </ul>
  );
}

function FlaggedRow({ row }: { row: Row }) {
  const [dayType, setDayType] = useState(row.day_type === "pending" ? "full_day" : row.day_type);
  const [hours, setHours] = useState(row.hours_worked?.toString() ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const employee = one(row.employee);
  const punchIn = one(row.punch_in ?? null);
  const punchOut = one(row.punch_out ?? null);

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("attendanceDayId", row.id);
    formData.set("day_type", dayType);
    formData.set("hours_worked", hours);
    formData.set("reason", reason);
    startTransition(async () => {
      const result = await correctAttendanceDay(formData);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <p className="text-sm font-medium text-foreground">
        {employee ? formatPersonName(employee.full_name) : "—"} · {row.date}
      </p>
      <p className="text-xs text-muted">Currently: {row.day_type.replace("_", " ")}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          Punch in: <LocationMapLink latitude={punchIn?.latitude} longitude={punchIn?.longitude} label="Verify" />
        </span>
        <span className="flex items-center gap-1.5">
          Punch out: <LocationMapLink latitude={punchOut?.latitude} longitude={punchOut?.longitude} label="Verify" />
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <select
          value={dayType}
          onChange={(e) => setDayType(e.target.value)}
          aria-label="Corrected day type"
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {DAY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Hours"
          aria-label="Corrected hours worked"
          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          aria-label="Correction reason"
          className="w-56 rounded-md border border-border bg-background px-2 py-1 text-xs"
        />
        <button
          onClick={submit}
          disabled={isPending || !reason.trim()}
          className="text-xs font-medium text-primary-strong disabled:opacity-50"
        >
          Save correction
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </li>
  );
}
