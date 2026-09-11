"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { ActionResult } from "@/server/actions/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LookupItem = { id: string; name: string; is_active: boolean };

export function LookupManager({
  label,
  singular,
  icon,
  emptyDescription,
  items,
  createAction,
  toggleAction,
}: {
  label: string;
  singular: string;
  icon: ReactNode;
  emptyDescription: string;
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
    <div className="grid lg:grid-cols-[1fr_20rem] gap-6">
      <div>
        {items.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center text-center py-14 px-6">
              <div className="rounded-full bg-primary-soft p-3 [&_svg]:h-6 [&_svg]:w-6 [&_svg]:text-primary-strong">
                {icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{`No ${label.toLowerCase()} yet`}</h3>
              <p className="mt-1 text-sm text-muted max-w-sm">{emptyDescription}</p>
            </div>
          </Card>
        ) : (
          <Card className="divide-y divide-border overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2.5 min-w-0 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-soft [&_svg]:shrink-0">
                  {icon}
                  <span className={item.is_active ? "text-foreground font-medium truncate" : "text-muted line-through truncate"}>
                    {item.name}
                  </span>
                  {!item.is_active && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <button
                  onClick={() => onToggle(item.id)}
                  disabled={isPending}
                  className="shrink-0 text-xs font-medium text-primary-strong hover:underline disabled:opacity-50"
                >
                  {item.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Card className="h-fit p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Add {singular.toLowerCase()}</h2>
        <form ref={formRef} action={onCreate} className="space-y-3">
          <input
            name="name"
            required
            placeholder={`${singular} name`}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add {singular.toLowerCase()}
          </Button>
        </form>
      </Card>
    </div>
  );
}
