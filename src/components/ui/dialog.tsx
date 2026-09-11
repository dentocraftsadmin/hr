"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type DialogHandle = { open: () => void; close: () => void };

/**
 * Native <dialog>-backed modal: focus trap, Escape-to-close, and backdrop
 * come from the browser for free, so there's no custom a11y plumbing to get
 * wrong. Opened imperatively via a ref rather than a boolean prop so the
 * parent doesn't need to unmount/remount the form inside it.
 */
export const Dialog = forwardRef<DialogHandle, { title: string; children: ReactNode }>(
  function Dialog({ title, children }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }));

    useEffect(() => {
      const el = dialogRef.current;
      if (!el) return;
      const onCancel = (e: Event) => e.stopPropagation();
      el.addEventListener("cancel", onCancel);
      return () => el.removeEventListener("cancel", onCancel);
    }, []);

    return (
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-title"
        className="m-auto w-full max-w-lg rounded-xl border border-border bg-surface p-0 shadow-lg backdrop:bg-foreground/30 open:animate-none"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="dialog-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-sunken hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">{children}</div>
      </dialog>
    );
  }
);
