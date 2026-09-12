"use client";

import { useImperativeHandle, useMemo, useRef, useState, useTransition, forwardRef } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { createEmployee } from "@/server/actions/employees";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Field, FormSection, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
type Office = { id: string; name: string; default_shift_id: string | null };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const EmployeeCreateDialog = forwardRef<
  DialogHandle,
  { departments: Option[]; designations: Option[]; shifts: Option[]; offices: Office[] }
>(function EmployeeCreateDialog({ departments, designations, shifts, offices }, ref) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [officeId, setOfficeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<DialogHandle>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.open(),
    close: () => dialogRef.current?.close(),
  }));

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
      dialogRef.current?.close();
    });
  }

  return (
    <Dialog ref={dialogRef} title="Add employee">
      <form ref={formRef} action={onCreate} className="space-y-6">
        <FormSection title="Personal information">
          <Field label="Full name" htmlFor="full_name" required>
            <Input id="full_name" name="full_name" required placeholder="Jane Doe" />
          </Field>
          <Field label="Mobile number" htmlFor="phone" required description="10 digits, no country code">
            <Input id="phone" name="phone" required inputMode="numeric" maxLength={10} placeholder="9876543210" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Birth month" htmlFor="birth_month" required>
              <Select id="birth_month" name="birth_month" required defaultValue="">
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Birth day" htmlFor="birth_day" required>
              <Input id="birth_day" name="birth_day" type="number" required min={1} max={31} placeholder="15" />
            </Field>
            <Field label="Birth year" htmlFor="birth_year" required>
              <Input
                id="birth_year"
                name="birth_year"
                type="number"
                required
                min={1940}
                max={new Date().getFullYear()}
                placeholder="1995"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Employment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Joining date" htmlFor="joining_date" required>
              <Input id="joining_date" name="joining_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Department" htmlFor="department_id" description="Optional">
              <Select id="department_id" name="department_id" defaultValue="">
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Designation" htmlFor="designation_id" description="Optional">
            <Select id="designation_id" name="designation_id" defaultValue="">
              <option value="">None</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Work assignment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Office" htmlFor="office_id" required>
              <Select id="office_id" name="office_id" required value={officeId} onChange={(e) => onOfficeChange(e.target.value)}>
                <option value="">Select office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </Field>
            <Field
              label="Shift"
              htmlFor="shift_id"
              description={defaultShiftForOffice ? "Office default preselected" : "Optional"}
            >
              <Select id="shift_id" name="shift_id" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
                <option value="">None</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Access">
          <Field
            label="Initial PIN"
            htmlFor="pin"
            required
            description="Choose a 4-digit PIN and share it with the employee directly — nothing is sent automatically."
          >
            <Input id="pin" name="pin" required inputMode="numeric" maxLength={4} placeholder="••••" className="tracking-widest max-w-[8rem]" />
          </Field>
        </FormSection>

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create employee
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

export function AddEmployeeButton(props: { departments: Option[]; designations: Option[]; shifts: Option[]; offices: Office[] }) {
  const ref = useRef<DialogHandle>(null);
  return (
    <>
      <Button onClick={() => ref.current?.open()}>
        <UserPlus className="h-4 w-4" />
        Add employee
      </Button>
      <EmployeeCreateDialog ref={ref} {...props} />
    </>
  );
}
