"use client";

import { useRef, useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { Clock, Plus, Loader2 } from "lucide-react";
import { createShift, toggleShift } from "@/server/actions/shifts";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

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

const CreateShiftDialog = forwardRef<DialogHandle, object>(function CreateShiftDialog(_, ref) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<DialogHandle>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.open(),
    close: () => dialogRef.current?.close(),
  }));

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createShift(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      dialogRef.current?.close();
    });
  }

  return (
    <Dialog ref={dialogRef} title="Add shift">
      <form ref={formRef} action={onCreate} className="space-y-4">
        <Field label="Shift name" htmlFor="s-name" required>
          <Input id="s-name" name="name" required placeholder="Morning" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" htmlFor="s-start" required>
            <Input id="s-start" name="start_time" type="time" required />
          </Field>
          <Field label="End time" htmlFor="s-end" required>
            <Input id="s-end" name="end_time" type="time" required />
          </Field>
        </div>
        <Field label="Working days" htmlFor="s-days">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-2.5 py-1.5 cursor-pointer has-[:checked]:bg-primary-soft has-[:checked]:border-primary"
              >
                <input type="checkbox" name="working_days" value={day.value} defaultChecked={day.value !== 0} className="accent-primary" />
                {day.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Late buffer (minutes)" htmlFor="s-buffer" description="Grace period before a punch-in counts as late">
          <Input id="s-buffer" name="late_buffer_minutes" type="number" defaultValue={0} min={0} max={120} className="max-w-[8rem]" />
        </Field>

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add shift
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

export function AddShiftButton() {
  const dialogRef = useRef<DialogHandle>(null);
  return (
    <>
      <Button onClick={() => dialogRef.current?.open()}>
        <Plus className="h-4 w-4" /> Add shift
      </Button>
      <CreateShiftDialog ref={dialogRef} />
    </>
  );
}

export function ShiftManager({ shifts }: { shifts: Shift[] }) {
  const [, startTransition] = useTransition();

  function onToggle(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => { await toggleShift(formData); });
  }

  if (shifts.length === 0) {
    return (
      <Card>
        <EmptyState icon={Clock} title="No shifts yet" description="Define working hours so attendance and lateness can be calculated automatically." />
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shifts.map((shift) => (
        <Card key={shift.id} className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="rounded-lg bg-primary-soft p-2 shrink-0">
                <Clock className="h-4 w-4 text-primary-strong" />
              </div>
              <p className="font-medium text-foreground truncate">{shift.name}</p>
            </div>
            <Badge tone={shift.is_active ? "success" : "neutral"}>{shift.is_active ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="mt-3 text-lg font-semibold text-foreground tabular-nums">
            {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
          </p>
          <p className="text-xs text-muted mb-2">{shift.late_buffer_minutes}m late buffer</p>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <span
                key={d.value}
                className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${
                  shift.working_days.includes(d.value) ? "bg-primary-soft text-primary-strong" : "bg-surface-sunken text-muted-soft"
                }`}
              >
                {d.label}
              </span>
            ))}
          </div>
          <button onClick={() => onToggle(shift.id)} className="mt-3 text-xs font-medium text-primary-strong hover:underline">
            {shift.is_active ? "Deactivate" : "Activate"}
          </button>
        </Card>
      ))}
    </div>
  );
}
