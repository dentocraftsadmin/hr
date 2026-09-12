"use client";

import { Delete } from "lucide-react";

/** The one numeric input mechanism for PIN and phone-number entry across the
 * app — fixed 1-9 / 0 / backspace layout everywhere it appears, so the
 * muscle memory built on the login screen still works during registration.
 * Never rearrange this grid.
 *
 * Renders both the value display (dots for a PIN, digits for a phone
 * number) and the button grid, so a caller never re-implements either.
 * There's no real <input> behind this — nothing here can trigger a native
 * mobile keyboard — so a hidden input is required at the call site to carry
 * the value into a <form>'s FormData. */
export function NumericKeypad({
  value,
  onChange,
  maxLength,
  mask = false,
  disabled = false,
  label,
}: {
  value: string;
  /** Accepts a plain next value or a React-style updater — pass a useState
   * setter directly. Presses always go through the updater form internally
   * so two taps arriving in the same render batch (this keypad is built
   * for fast repeated tapping) each see the other's result instead of both
   * computing from the same stale `value` prop and one silently winning. */
  onChange: (next: string | ((prev: string) => string)) => void;
  maxLength: number;
  /** true for a PIN (dots), false for a phone number (visible digits). */
  mask?: boolean;
  disabled?: boolean;
  /** Accessible name for the whole control, e.g. "4-digit PIN" or "Mobile number". */
  label: string;
}) {
  function press(digit: string) {
    if (disabled) return;
    onChange((prev) => (prev.length >= maxLength ? prev : prev + digit));
  }

  function backspace() {
    if (disabled) return;
    onChange((prev) => prev.slice(0, -1));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      press(e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      backspace();
    }
  }

  const rows: string[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "backspace"],
  ];

  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* A long value (a 10-digit phone number) needs noticeably tighter
          slots than a 4-digit PIN to stay inside a 375px viewport without
          horizontal overflow. */}
      <div className={`flex items-center justify-center mb-4 ${maxLength > 6 ? "gap-1" : "gap-2.5"}`} aria-hidden="true">
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < value.length;
          return mask ? (
            <span
              key={i}
              className={`h-3 w-3 rounded-full border-2 transition-colors ${
                filled ? "bg-primary border-primary" : "border-border"
              }`}
            />
          ) : (
            <span
              key={i}
              className={`flex items-center justify-center rounded-md border font-medium tabular-nums ${
                maxLength > 6 ? "h-8 w-6 text-sm" : "h-9 w-7 text-lg"
              } ${filled ? "border-primary text-foreground" : "border-border text-muted-soft"}`}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-[15rem] mx-auto select-none">
        {rows.flat().map((key, i) => {
          if (key === "") return <div key={i} aria-hidden="true" />;
          if (key === "backspace") {
            return (
              <button
                key={i}
                type="button"
                onClick={backspace}
                disabled={disabled || value.length === 0}
                aria-label="Backspace"
                className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-foreground active:bg-surface-sunken disabled:opacity-40 transition-colors"
              >
                <Delete className="h-5 w-5" />
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={disabled || value.length >= maxLength}
              aria-label={`Digit ${key}`}
              className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-xl font-medium text-foreground active:bg-surface-sunken disabled:opacity-40 transition-colors"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
