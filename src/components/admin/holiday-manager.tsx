"use client";

import { useRef, useState, useTransition } from "react";
import { createHoliday, removeHoliday } from "@/server/actions/holidays";

type Office = { id: string; name: string };
type Holiday = { id: string; name: string; date: string; office: { name: string } | { name: string }[] | null };

export function HolidayManager({ holidays, offices }: { holidays: Holiday[]; offices: Office[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createHoliday(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  function onRemove(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await removeHoliday(formData);
    });
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-foreground">Holidays</h1>

      <form ref={formRef} action={onCreate} className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
        <input name="name" required placeholder="Holiday name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input type="date" name="date" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <select name="applies_to_office_id" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} only
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={isPending} className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
          Add holiday
        </button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {holidays.length === 0 && <li className="px-4 py-3 text-sm text-muted">No holidays yet.</li>}
        {holidays.map((h) => {
          const office = Array.isArray(h.office) ? h.office[0] : h.office;
          return (
            <li key={h.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-foreground font-medium">{h.name}</p>
                <p className="text-xs text-muted">
                  {h.date}
                  {office ? ` · ${office.name} only` : ""}
                </p>
              </div>
              <button onClick={() => onRemove(h.id)} disabled={isPending} className="text-xs font-medium text-muted underline">
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
