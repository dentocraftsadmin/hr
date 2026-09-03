"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { createEmployee } from "@/server/actions/employees";

type Option = { id: string; name: string };
type Office = { id: string; name: string; default_shift_id: string | null };

export function EmployeeCreateForm({
  departments,
  designations,
  shifts,
  offices,
}: {
  departments: Option[];
  designations: Option[];
  shifts: Option[];
  offices: Office[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [officeId, setOfficeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const defaultShiftForOffice = useMemo(
    () => offices.find((o) => o.id === officeId)?.default_shift_id ?? "",
    [officeId, offices]
  );

  function onOfficeChange(id: string) {
    setOfficeId(id);
    const office = offices.find((o) => o.id === id);
    if (office?.default_shift_id) setShiftId(office.default_shift_id);
  }

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createEmployee(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOfficeId("");
      setShiftId("");
    });
  }

  return (
    <form ref={formRef} action={onCreate} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-medium text-foreground">Add employee</h2>

      <input
        name="full_name"
        required
        placeholder="Full name"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />

      <div className="flex gap-3">
        <input
          name="phone"
          required
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit mobile number"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="pin"
          required
          inputMode="numeric"
          maxLength={4}
          placeholder="Initial 4-digit PIN"
          className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm tracking-widest"
        />
      </div>

      <div className="flex gap-3">
        <input
          name="birth_year"
          type="number"
          required
          min={1940}
          max={new Date().getFullYear()}
          placeholder="Birth year"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          name="joining_date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3">
        <select name="department_id" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="designation_id" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="">Designation</option>
          {designations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <select
          name="office_id"
          required
          value={officeId}
          onChange={(e) => onOfficeChange(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Office</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          name="shift_id"
          value={shiftId}
          onChange={(e) => setShiftId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Shift{defaultShiftForOffice ? " (office default preselected)" : ""}</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create employee"}
      </button>
    </form>
  );
}
