"use client";

import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions/auth";

type LookupItem = { id: string; name: string; is_active: boolean };

export function LookupManager({
  label,
  items,
  createAction,
  toggleAction,
}: {
  label: string;
  items: LookupItem[];
  createAction: (formData: FormData) => Promise<ActionResult>;
  toggleAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAction(formData);
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
    startTransition(async () => {
      await toggleAction(formData);
    });
  }

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold text-foreground">{label}</h1>

      <form ref={formRef} action={onCreate} className="mt-4 flex gap-2">
        <input
          name="name"
          required
          placeholder={`New ${label.toLowerCase().replace(/s$/, "")} name`}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-primary text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-surface">
        {items.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Nothing here yet.</li>
        )}
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2.5">
            <span className={item.is_active ? "text-foreground" : "text-muted line-through"}>
              {item.name}
            </span>
            <button
              onClick={() => onToggle(item.id)}
              disabled={isPending}
              className="text-xs font-medium text-muted underline"
            >
              {item.is_active ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
