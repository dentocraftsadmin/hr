"use client";

import { useEffect, useRef, useState } from "react";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selector for the real element this step explains. Omitted for a
   * centered step with no specific target (welcome/finish). A step whose
   * selector doesn't resolve to anything in the DOM is silently dropped
   * rather than shown pointing at nothing — see the filtering effect below. */
  selector?: string;
};

/**
 * A minimal, dependency-free spotlight tour: dims the screen, cuts a
 * highlighted hole over the target element (a single absolutely-positioned
 * div whose oversized box-shadow does the dimming — its own background
 * stays transparent, so the "hole" is just wherever the div is, no masking
 * trick needed), and shows a short tooltip with Back/Next/Skip/Finish next
 * to it. Every visual layer is pointer-events-none except the tooltip's own
 * buttons, so the tour never blocks a punch, a nav click, or anything else
 * on the page underneath it while it's open.
 *
 * Never throws past its own boundary: every DOM query is wrapped, and a
 * step whose target can't be found is dropped rather than breaking the
 * tour or the page around it.
 */
export function GuidedTour({
  steps,
  active,
  onSkip,
  onFinish,
}: {
  steps: TourStep[];
  active: boolean;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const [resolvedSteps, setResolvedSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Stops the settle-window re-polling below the moment the user acts, so a
  // step list that's still resolving in the background can never reshuffle
  // out from under them mid-navigation.
  const userAdvancedRef = useRef(false);

  // Only keep steps whose target actually exists — e.g. quick unlock's card
  // resolves its own visibility asynchronously on mount (a server check for
  // whether a credential exists), so it can genuinely still be absent for
  // over a second after the dashboard itself has painted. Polling a few
  // times over ~2s, rather than checking once, means a real step isn't
  // dropped just because the tour looked before that card was ready — this
  // one-time settle window is a small, fixed cost against a roughly
  // one-minute tour, not a per-step delay.
  useEffect(() => {
    if (!active) {
      Promise.resolve().then(() => setResolvedSteps([]));
      return;
    }
    userAdvancedRef.current = false;
    let attempts = 0;
    function check() {
      if (userAdvancedRef.current) return;
      attempts += 1;
      try {
        setResolvedSteps(steps.filter((s) => !s.selector || document.querySelector(s.selector)));
      } catch {
        setResolvedSteps([]);
      }
      if (attempts === 1) setStepIndex(0);
    }
    const interval = window.setInterval(check, 400);
    // A generous cap, not a UX delay: it only matters if the user is still
    // sitting on step 1 (nothing to see yet) when it fires, and stops
    // re-checking the moment they act (userAdvancedRef) regardless.
    const timer = window.setTimeout(() => window.clearInterval(interval), 15000);
    Promise.resolve().then(check);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [active, steps]);

  const step = resolvedSteps[stepIndex] ?? null;

  useEffect(() => {
    if (!step?.selector) {
      Promise.resolve().then(() => setRect(null));
      return;
    }
    function measure() {
      try {
        const el = step!.selector ? document.querySelector(step!.selector as string) : null;
        setRect(el ? el.getBoundingClientRect() : null);
      } catch {
        setRect(null);
      }
    }
    measure();
    try {
      document.querySelector(step.selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // Non-essential — the step still renders centered if this fails.
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Cheap fallback for layout shifts an explicit listener won't catch
    // (e.g. an async card above the target changing height).
    const interval = window.setInterval(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    if (step) panelRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, onSkip]);

  if (!active || !step) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === resolvedSteps.length - 1;

  function next() {
    userAdvancedRef.current = true;
    if (isLast) onFinish();
    else setStepIndex((i) => i + 1);
  }
  function back() {
    userAdvancedRef.current = true;
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const panelWidth = 320;
  const margin = 12;
  const panelPosition =
    rect && typeof window !== "undefined"
      ? {
          top: Math.min(Math.max(margin, rect.bottom + margin), window.innerHeight - margin - 200),
          left: Math.min(Math.max(margin, rect.left), window.innerWidth - panelWidth - margin),
        }
      : null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {rect ? (
        <div
          className="fixed rounded-xl transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-foreground/60" />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-body"
        tabIndex={-1}
        className="fixed w-[calc(100%-1.5rem)] rounded-xl border border-border bg-surface p-4 shadow-lg outline-none pointer-events-auto"
        style={
          panelPosition
            ? { top: panelPosition.top, left: panelPosition.left, maxWidth: panelWidth }
            : { top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: panelWidth }
        }
      >
        <p className="text-xs font-medium text-muted-soft">
          Step {stepIndex + 1} of {resolvedSteps.length}
        </p>
        <h2 id="tour-step-title" className="mt-1 text-sm font-semibold text-foreground">
          {step.title}
        </h2>
        <p id="tour-step-body" className="mt-1.5 text-sm text-muted leading-relaxed">
          {step.body}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onSkip} className="text-xs font-medium text-muted hover:text-foreground">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={back}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-sunken"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-strong"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
