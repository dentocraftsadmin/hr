"use client";

import { useEffect, useState, useTransition } from "react";
import { Fingerprint, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasQuickUnlockCredential, removeAllQuickUnlockCredentials } from "@/server/actions/webauthn";
import { setUpQuickUnlock, clearQuickUnlockSession } from "@/lib/webauthn/client";

const DISMISS_KEY_PREFIX = "craftshr_quick_unlock_dismissed_";

export function QuickUnlockCard({ phone }: { phone: string }) {
  const [supported, setSupported] = useState(true);
  const [hasCredential, setHasCredential] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(true); // default true until we know otherwise, to avoid a flash
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    hasQuickUnlockCredential().then((cred) => {
      if (cancelled) return;
      setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
      setHasCredential(cred);
      setDismissed(localStorage.getItem(DISMISS_KEY_PREFIX + phone) === "1");
    });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  function onSkip() {
    localStorage.setItem(DISMISS_KEY_PREFIX + phone, "1");
    setDismissed(true);
  }

  function onSetUp() {
    setMessage(null);
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.refresh_token) {
        setMessage("Could not read your current sign-in session. Try signing out and back in first.");
        return;
      }
      const result = await setUpQuickUnlock(phone, session.refresh_token);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setHasCredential(true);
      localStorage.removeItem(DISMISS_KEY_PREFIX + phone);
    });
  }

  function onRemove() {
    setMessage(null);
    startTransition(async () => {
      await removeAllQuickUnlockCredentials();
      await clearQuickUnlockSession(phone);
      setHasCredential(false);
    });
  }

  if (hasCredential === null) return null; // still checking — avoid a flash of the wrong state
  if (dismissed && !hasCredential) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary-soft p-2">
            <Fingerprint className="h-4 w-4 text-primary-strong" />
          </div>
          <div>
            <p className="font-medium text-foreground">Quick unlock</p>
            <p className="text-xs text-muted">
              {hasCredential
                ? "Set up on this device — sign in with your fingerprint, face, or device PIN instead of typing your PIN."
                : "Sign in on this device with your fingerprint, face, or device PIN instead of typing your PIN. Optional."}
            </p>
          </div>
        </div>
        {hasCredential && <Check className="h-4 w-4 text-success shrink-0" aria-label="Enabled" />}
      </div>

      {message && <p className="mt-2 text-xs text-danger">{message}</p>}

      <div className="mt-3 flex gap-2">
        {hasCredential ? (
          <button onClick={onRemove} disabled={isPending} className="text-xs font-medium text-danger disabled:opacity-50">
            Turn off quick unlock
          </button>
        ) : supported ? (
          <>
            <button
              onClick={onSetUp}
              disabled={isPending}
              className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-strong disabled:opacity-50"
            >
              Set up now
            </button>
            <button onClick={onSkip} disabled={isPending} className="text-xs text-muted disabled:opacity-50">
              Skip for now
            </button>
          </>
        ) : (
          <button onClick={onSkip} className="text-xs text-muted">
            Dismiss
          </button>
        )}
      </div>
      {!supported && !hasCredential && (
        <p className="mt-2 text-xs text-muted">This browser or device doesn&rsquo;t support quick unlock.</p>
      )}
    </div>
  );
}
