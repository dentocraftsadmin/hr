"use client";

import { useRef, useState, useTransition, forwardRef, useImperativeHandle } from "react";
import { MapPin, Plus, Crosshair, Loader2 } from "lucide-react";
import { createOffice, toggleOffice } from "@/server/actions/offices";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type Shift = { id: string; name: string };
type Office = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
};

const CreateOfficeDialog = forwardRef<DialogHandle, { shifts: Shift[] }>(function CreateOfficeDialog(
  { shifts },
  ref
) {
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
      const result = await createOffice(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      dialogRef.current?.close();
    });
  }

  function useDeviceLocation() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const lat = formRef.current?.elements.namedItem("latitude") as HTMLInputElement;
      const lng = formRef.current?.elements.namedItem("longitude") as HTMLInputElement;
      if (lat) lat.value = pos.coords.latitude.toFixed(6);
      if (lng) lng.value = pos.coords.longitude.toFixed(6);
    });
  }

  return (
    <Dialog ref={dialogRef} title="Add office">
      <form ref={formRef} action={onCreate} className="space-y-4">
        <Field label="Office name" htmlFor="o-name" required>
          <Input id="o-name" name="name" required placeholder="Head Office" />
        </Field>
        <Field label="Office code" htmlFor="o-code" description="Optional">
          <Input id="o-code" name="code" placeholder="HO" />
        </Field>
        <Field label="Address" htmlFor="o-address" description="Optional">
          <textarea
            id="o-address"
            name="address"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" htmlFor="o-lat" required>
            <Input id="o-lat" name="latitude" type="number" step="any" required />
          </Field>
          <Field label="Longitude" htmlFor="o-lng" required>
            <Input id="o-lng" name="longitude" type="number" step="any" required />
          </Field>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={useDeviceLocation}>
          <Crosshair className="h-3.5 w-3.5" /> Use my current location
        </Button>
        <Field label="Check-in radius (meters)" htmlFor="o-radius" description="How far from this point an employee can punch in">
          <Input id="o-radius" name="radius_meters" type="number" defaultValue={200} min={20} max={5000} />
        </Field>
        <Field label="Default shift" htmlFor="o-shift" description="Preselected on employee registration, HR can override">
          <Select id="o-shift" name="default_shift_id" defaultValue="">
            <option value="">No default</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add office
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

export function AddOfficeButton({ shifts }: { shifts: Shift[] }) {
  const dialogRef = useRef<DialogHandle>(null);
  return (
    <>
      <Button onClick={() => dialogRef.current?.open()}>
        <Plus className="h-4 w-4" /> Add office
      </Button>
      <CreateOfficeDialog ref={dialogRef} shifts={shifts} />
    </>
  );
}

export function OfficeManager({ offices }: { offices: Office[] }) {
  const [, startTransition] = useTransition();

  function onToggle(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      await toggleOffice(formData);
    });
  }

  return (
    <div>
      {offices.length === 0 ? (
        <Card>
          <EmptyState
            icon={MapPin}
            title="No offices yet"
            description="Add your first work location to enable geofenced attendance check-ins."
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((office) => (
            <Card key={office.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="rounded-lg bg-primary-soft p-2 shrink-0">
                    <MapPin className="h-4 w-4 text-primary-strong" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{office.name}</p>
                    {office.code && <p className="text-xs text-muted">{office.code}</p>}
                  </div>
                </div>
                <Badge tone={office.is_active ? "success" : "neutral"}>
                  {office.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {office.address && <p className="mt-3 text-sm text-muted line-clamp-2">{office.address}</p>}
              <p className="mt-2 text-xs text-muted-soft tabular-nums">
                {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)} · {office.radius_meters}m radius
              </p>
              <button
                onClick={() => onToggle(office.id)}
                className="mt-3 text-xs font-medium text-primary-strong hover:underline"
              >
                {office.is_active ? "Deactivate" : "Activate"}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
