"use client";

import { useRef, useState, useTransition } from "react";
import { createOffice, toggleOffice } from "@/server/actions/offices";

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

export function OfficeManager({ offices, shifts }: { offices: Office[]; shifts: Shift[] }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createOffice(formData);
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
    startTransition(async () => { await toggleOffice(formData); });
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
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-foreground">Offices</h1>

      <form ref={formRef} action={onCreate} className="mt-4 space-y-3 rounded-lg border border-border bg-surface p-4">
        <input
          name="name"
          required
          placeholder="Office name"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          name="code"
          placeholder="Office code (optional)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          name="address"
          placeholder="Address (optional)"
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-3">
          <input
            name="latitude"
            type="number"
            step="any"
            required
            placeholder="Latitude"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            name="longitude"
            type="number"
            step="any"
            required
            placeholder="Longitude"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={useDeviceLocation}
            className="shrink-0 rounded-lg border border-border text-sm px-3 py-2 text-muted"
          >
            Use my location
          </button>
        </div>
        <label className="block text-sm text-muted">
          Check-in radius (meters)
          <input
            type="number"
            name="radius_meters"
            defaultValue={200}
            min={20}
            max={5000}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </label>
        <label className="block text-sm text-muted">
          Default shift (preselected on registration, HR can override)
          <select
            name="default_shift_id"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">No default</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Add office
        </button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {offices.length === 0 && <li className="px-4 py-3 text-sm text-muted">No offices yet.</li>}
        {offices.map((office) => (
          <li key={office.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className={office.is_active ? "text-foreground font-medium" : "text-muted line-through"}>
                {office.name} {office.code && <span className="text-muted font-normal">({office.code})</span>}
              </p>
              <p className="text-xs text-muted">
                {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)} · {office.radius_meters}m radius
              </p>
            </div>
            <button onClick={() => onToggle(office.id)} disabled={isPending} className="text-xs font-medium text-muted underline">
              {office.is_active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
