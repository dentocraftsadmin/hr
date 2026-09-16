"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GuidedTour, type TourStep } from "@/components/shared/guided-tour";
import { markTourSeen } from "@/server/actions/tour";

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to CraftsHR",
    body: "A quick, one-minute tour of the essentials — skip any time.",
  },
  {
    id: "punch",
    title: "Punch In / Punch Out",
    body: "Punch in when your shift starts and out when it ends. Your location is recorded for verification — after punching, you can check the exact recorded spot on Google Maps.",
    selector: '[data-tour="punch"]',
  },
  {
    id: "attendance",
    title: "Attendance",
    body: "This Attendance tab is home base — it always shows today's punch status.",
    selector: '[data-tour="nav-attendance"]',
  },
  {
    id: "leave",
    title: "Leave",
    body: "Request time off here. Leave with enough advance notice is informed; late or missing notice affects your score — see Rules & Policies for the exact numbers.",
    selector: '[data-tour="nav-leave"]',
  },
  {
    id: "score",
    title: "Points & compliance",
    body: "Your compliance score, and every point added or deducted with its reason, live right here.",
    selector: '[data-tour="score"]',
  },
  {
    id: "rules",
    title: "Rules & Policies",
    body: "Tap here any time for the complete rules — notice requirements, scoring, and holidays, in plain language.",
    selector: '[data-tour="nav-rules"]',
  },
  {
    id: "notifications",
    title: "Notifications",
    body: "Turn on reminders here so you never forget to punch in or out.",
    selector: '[data-tour="notifications"]',
  },
  {
    id: "profile",
    title: "Your device options",
    body: "Set up quick unlock to sign in with your fingerprint or face instead of your PIN — optional. You can sign out any time from the bottom of this page.",
    selector: '[data-tour="profile"]',
  },
  {
    id: "finish",
    title: "You're all set",
    body: "That's everything you need to get started with CraftsHR.",
  },
];

/**
 * Auto-starts once, right after a first login (shouldAutoStart), or on
 * demand via the "Take the tour again" link on /rules (forceStart, which
 * arrives as a ?tour=1 query param the dashboard page reads server-side).
 * Wrapped so nothing here can affect the dashboard around it: if anything
 * throws during setup, the tour just doesn't appear — it never blocks
 * normal use of the page.
 */
export function EmployeeTour({ shouldAutoStart, forceStart }: { shouldAutoStart: boolean; forceStart: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      if (forceStart || shouldAutoStart) Promise.resolve().then(() => setActive(true));
      // Strip the query param immediately so refreshing doesn't re-trigger it.
      if (forceStart) router.replace("/dashboard");
    } catch {
      Promise.resolve().then(() => setActive(false));
    }
  }, [forceStart, shouldAutoStart, router]);

  function finish() {
    setActive(false);
    markTourSeen().catch(() => {
      // Best-effort: if this fails, the tour may show again next login,
      // which is a harmless inconvenience, not a broken app.
    });
  }

  return <GuidedTour steps={STEPS} active={active} onSkip={finish} onFinish={finish} />;
}
