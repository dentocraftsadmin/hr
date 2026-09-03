"use client";

import { useRef, useState, useTransition } from "react";
import { createShift, toggleShift } from "@/server/actions/shifts";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

type Shift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  working_days: number[];
  late_buffer_minutes: number;
  is_active: boolean;
};

export function ShiftManager({ shifts }: { shifts: Shift[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createShift(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  function onToggle(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => { await toggleShift(formData); });
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-foreground">Shifts</h1>

      <form ref={formRef} action={onCreate} className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
        <input
          name="name"
          required
          placeholder="Shift name (e.g. Morning)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-3">
          <label className="flex-1 text-sm text-muted">
            Start
            <input
              type="time"
              name="start_time"
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="flex-1 text-sm text-muted">
            End
            <input
              type="time"
              name="end_time"
              required
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Working days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-2.5 py-1.5 cursor-pointer has-[:checked]:bg-primary-soft has-[:checked]:border-primary"
              >
                <input type="checkbox" name="working_days" value={day.value} defaultChecked={day.value !== 0} />
                {day.label}
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm text-muted">
          Late buffer (minutes)
          <input
            type="number"
            name="late_buffer_minutes"
            defaultValue={0}
            min={0}
            max={120}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Add shift
        </button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {shifts.length === 0 && <li className="px-4 py-3 text-sm text-muted">No shifts yet.</li>}
        {shifts.map((shift) => (
          <li key={shift.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={shift.is_active ? "text-foreground font-medium" : "text-muted line-through"}>
                {shift.name}
              </p>
              <p className="text-xs text-muted">
                {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)} · {shift.late_buffer_minutes}m buffer
              </p>
            </div>
            <button onClick={() => onToggle(shift.id)} disabled={isPending} className="text-xs font-medium text-muted underline">
              {shift.is_active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
