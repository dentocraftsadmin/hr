"use client";

import { useRef, useState, type RefObject } from "react";
import { Delete } from "lucide-react";

/** A field a shared keypad can target. `onChange` always goes through the
 * updater form internally (see useSharedKeypad) so two presses arriving in
 * the same render batch each see the other's result instead of one
 * silently clobbering the other. */
export type KeypadFieldConfig = {
  value: string;
  onChange: (next: string | ((prev: string) => string)) => void;
  maxLength: number;
};

/** Drives one shared NumericKeypad grid across several fields (e.g. mobile
 * number + PIN) — exactly one grid is ever rendered per form; which field
 * it edits is just a piece of state here, never a second keypad instance.
 * Tapping/focusing a field's NumericKeypadField makes it active; the grid
 * always acts on whichever field is currently active. */
export function useSharedKeypad(fields: KeypadFieldConfig[]) {
  const [activeIndex, setActiveIndex] = useState(0);
  const keypadRef = useRef<HTMLDivElement>(null);
  const active = fields[activeIndex];

  /** Switches the active field. The keypad grid never moves in the DOM —
   * only this index changes — so it can't create, duplicate, hide, or
   * reposition itself; scrolling it into view just makes an already-fixed
   * element visible when the newly active field is far away on screen. */
  function activate(index: number) {
    setActiveIndex(index);
    keypadRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function onDigit(digit: string) {
    active.onChange((prev) => (prev.length >= active.maxLength ? prev : prev + digit));
  }

  function onBackspace() {
    active.onChange((prev) => prev.slice(0, -1));
  }

  /** Desktop keyboard support for a specific field: typing while that
   * field's display has focus edits it directly and marks it active,
   * without requiring a click on the shared grid first. */
  function onKeyDownFor(index: number) {
    return (e: React.KeyboardEvent) => {
      setActiveIndex(index);
      const field = fields[index];
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        field.onChange((prev) => (prev.length >= field.maxLength ? prev : prev + e.key));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        field.onChange((prev) => prev.slice(0, -1));
      }
    };
  }

  return {
    activeIndex,
    activate,
    onDigit,
    onBackspace,
    onKeyDownFor,
    keypadRef,
    activeLength: active.value.length,
    activeMaxLength: active.maxLength,
  };
}

/** The value display for one field targeted by a shared keypad — dots for
 * a PIN, digits for a phone number. Tapping or focusing it makes it the
 * active field; it renders no buttons of its own, so using it never adds a
 * second keypad instance to the form. */
export function NumericKeypadField({
  value,
  maxLength,
  mask = false,
  label,
  active,
  onActivate,
  onKeyDown,
  disabled = false,
}: {
  value: string;
  maxLength: number;
  /** true for a PIN (dots), false for a phone number (visible digits). */
  mask?: boolean;
  /** Accessible name for this field, e.g. "4-digit PIN" or "Mobile number". */
  label: string;
  /** Whether the shared keypad is currently editing this field. */
  active: boolean;
  onActivate: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
}) {
  return (
    <div
      tabIndex={0}
      role="group"
      aria-label={label}
      aria-disabled={disabled}
      onFocus={disabled ? undefined : onActivate}
      onClick={disabled ? undefined : onActivate}
      onKeyDown={disabled ? undefined : onKeyDown}
      className={`outline-none rounded-xl transition-shadow focus-visible:ring-2 focus-visible:ring-primary ${
        active ? "ring-2 ring-primary/40" : ""
      }`}
    >
      {/* A long value (a 10-digit phone number) needs noticeably tighter
          slots than a 4-digit PIN to stay inside a 375px viewport without
          horizontal overflow. */}
      <div className={`flex items-center justify-center ${maxLength > 6 ? "gap-1" : "gap-2.5"}`} aria-hidden="true">
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
    </div>
  );
}

/** The one numeric button grid for PIN and phone-number entry across the
 * app — fixed 1-9 / 0 / backspace layout everywhere it appears. Never
 * rearrange this grid.
 *
 * A single instance of this is shared across every numeric field in a
 * form (see useSharedKeypad) — it has no value of its own, it always acts
 * on whichever field is currently active. There's no real <input> behind
 * this — nothing here can trigger a native mobile keyboard — so a hidden
 * input is required at each field's call site to carry its value into a
 * <form>'s FormData. */
export function NumericKeypad({
  onDigit,
  onBackspace,
  activeLength,
  activeMaxLength,
  disabled = false,
  keypadRef,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Length/max of whichever field is currently active — drives which
   * buttons are disabled (full field, empty field), since the grid itself
   * holds no field value. */
  activeLength: number;
  activeMaxLength: number;
  disabled?: boolean;
  keypadRef?: RefObject<HTMLDivElement | null>;
}) {
  const rows: string[][] = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "backspace"],
  ];

  return (
    <div ref={keypadRef} className="grid grid-cols-3 gap-3 max-w-[15rem] mx-auto select-none">
      {rows.flat().map((key, i) => {
        if (key === "") return <div key={i} aria-hidden="true" />;
        if (key === "backspace") {
          return (
            <button
              key={i}
              type="button"
              onClick={onBackspace}
              disabled={disabled || activeLength === 0}
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
            onClick={() => onDigit(key)}
            disabled={disabled || activeLength >= activeMaxLength}
            aria-label={`Digit ${key}`}
            className="flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-xl font-medium text-foreground active:bg-surface-sunken disabled:opacity-40 transition-colors"
          >
            {key}
          </button>
        );
      })}
    </div>
  );
}
