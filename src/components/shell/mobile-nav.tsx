"use client";

import { useRef } from "react";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Open navigation menu"
        className="lg:hidden rounded-lg p-2 text-foreground hover:bg-surface-sunken"
      >
        <Menu className="h-5 w-5" />
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Navigation"
        style={{ position: "fixed", inset: "0 auto 0 0", margin: 0, height: "100dvh", maxHeight: "100dvh" }}
        className="w-72 max-w-[85vw] bg-sidebar-bg p-0 backdrop:bg-foreground/30"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
            <Brand size="sm" />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close navigation menu"
              className="rounded-lg p-1.5 text-muted hover:bg-sidebar-bg-elevated"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav onNavigate={() => dialogRef.current?.close()} />
          </div>
        </div>
      </dialog>
    </>
  );
}
