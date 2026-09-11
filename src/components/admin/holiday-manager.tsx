"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { PartyPopper, MapPin, Trash2, Loader2 } from "lucide-react";
import { createHoliday, removeHoliday } from "@/server/actions/holidays";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";

type Office = { id: string; name: string };
type Holiday = { id: string; name: string; date: string; office: { name: string } | { name: string }[] | null };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DateBadge({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  return (
    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-primary-soft">
      <span className="text-[10px] font-semibold uppercase leading-none text-primary-strong">
        {d.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span className="text-lg font-semibold leading-tight text-primary-strong">{d.getDate()}</span>
    </div>
  );
}

export function HolidayManager({ holidays, offices }: { holidays: Holiday[]; offices: Office[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const grouped = useMemo(() => {
    const byMonth = new Map<number, Holiday[]>();
    for (const h of holidays) {
      const month = new Date(h.date + "T00:00:00").getMonth();
      byMonth.set(month, [...(byMonth.get(month) ?? []), h]);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a - b);
  }, [holidays]);

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

  function onRemove(id: string, name: string) {
    if (!window.confirm(`Remove "${name}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await removeHoliday(formData);
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_20rem] gap-6">
      <div>
        {holidays.length === 0 ? (
          <Card>
            <EmptyState
              icon={PartyPopper}
              title="No holidays configured"
              description="Add the company's holidays for the year so attendance and leave account for them automatically."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([month, items]) => (
              <div key={month}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-soft mb-2">
                  {MONTH_NAMES[month]}
                </h3>
                <Card className="divide-y divide-border overflow-hidden">
                  {items.map((h) => {
                    const office = Array.isArray(h.office) ? h.office[0] : h.office;
                    return (
                      <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                        <DateBadge date={h.date} />
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground font-medium truncate">{h.name}</p>
                          {office && (
                            <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {office.name} only
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemove(h.id, h.name)}
                          disabled={isPending}
                          aria-label={`Remove ${h.name}`}
                          className="shrink-0 rounded-lg p-1.5 text-muted-soft hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="h-fit p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Add holiday</h2>
        <form ref={formRef} action={onCreate} className="space-y-3">
          <Field label="Holiday name" htmlFor="h-name" required>
            <Input id="h-name" name="name" required placeholder="Diwali" />
          </Field>
          <Field label="Date" htmlFor="h-date" required>
            <Input id="h-date" name="date" type="date" required />
          </Field>
          <Field label="Applies to" htmlFor="h-office" description="Leave as all offices unless this is location-specific">
            <Select id="h-office" name="applies_to_office_id" defaultValue="">
              <option value="">All offices</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name} only</option>
              ))}
            </Select>
          </Field>
          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add holiday
          </Button>
        </form>
      </Card>
    </div>
  );
}
