"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { setLeaveNoticeDays } from "@/server/actions/leave-policy";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function LeaveNoticePolicyCard({ initialDays }: { initialDays: number | null }) {
  const [days, setDays] = useState(initialDays);
  const [input, setInput] = useState(initialDays?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    const formData = new FormData();
    formData.set("days", input);
    startTransition(async () => {
      const result = await setLeaveNoticeDays(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDays(Number(input));
    });
  }

  function clear() {
    setError(null);
    if (!window.confirm("Turn off the notice-period rule? Future leave requests won't be scored on timing until you set a new value.")) return;
    const formData = new FormData();
    formData.set("clear", "true");
    startTransition(async () => {
      const result = await setLeaveNoticeDays(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDays(null);
      setInput("");
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary-soft p-2">
            <CalendarClock className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Leave notice requirement</p>
            <p className="text-xs text-muted max-w-sm">
              Employees must inform the company at least this many qualifying days before leave to avoid a score deduction.
              Official holidays count as qualifying days; a plain weekly off that isn&rsquo;t a logged holiday does not.
            </p>
          </div>
        </div>
        <Badge tone={days !== null ? "success" : "neutral"}>{days !== null ? "Active" : "Off"}</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={60}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. 3"
          className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-sm text-muted">days</span>
        <Button size="sm" onClick={save} disabled={isPending || !input}>
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
        {days !== null && (
          <Button size="sm" variant="ghost" onClick={clear} disabled={isPending}>
            Turn off
          </Button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-2 text-xs text-muted-soft">
        Changing this only affects leave finalized after the change — past decisions keep the reason recorded at the time.
      </p>
    </Card>
  );
}
