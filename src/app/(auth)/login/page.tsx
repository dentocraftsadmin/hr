"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Loader2, ShieldCheck, Clock, Users, Fingerprint } from "lucide-react";
import { login } from "@/server/actions/auth";
import { NumericKeypad } from "@/components/ui/numeric-keypad";
import { createClient } from "@/lib/supabase/client";
import { hasQuickUnlockSession, tryQuickUnlockLogin, clearQuickUnlockSession } from "@/lib/webauthn/client";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [quickUnlockAvailable, setQuickUnlockAvailable] = useState(false);
  const [quickUnlockMessage, setQuickUnlockMessage] = useState<string | null>(null);

  useEffect(() => {
    if (phone.length !== 10) return;
    let cancelled = false;
    hasQuickUnlockSession(phone).then((v) => {
      if (!cancelled) setQuickUnlockAvailable(v);
    });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("pin", pin);
    startTransition(async () => {
      const result = await login(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // router.replace() already performs a full fresh server fetch for a
      // route with no prior client-side cache entry, so a follow-up
      // router.refresh() here only re-fetches the same data a second time.
      router.replace(result.role === "admin" ? "/admin" : "/dashboard");
    });
  }

  function onUseQuickUnlock() {
    setQuickUnlockMessage(null);
    startTransition(async () => {
      const result = await tryQuickUnlockLogin(phone);
      if (!result.ok) {
        setQuickUnlockMessage(result.message);
        if (result.reason === "not_configured") setQuickUnlockAvailable(false);
        return;
      }

      const supabase = createClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: result.refreshToken });
      if (refreshError || !data.session) {
        await clearQuickUnlockSession(phone);
        setQuickUnlockAvailable(false);
        setQuickUnlockMessage("Your quick unlock session expired — please sign in with your PIN.");
        return;
      }
      // Quick unlock is employee-only by construction (webauthn_credentials
      // always belongs to an employee, never an admin-only account).
      router.replace("/dashboard");
    });
  }

  return (
    <main className="min-h-screen flex bg-background">
      {/* Brand panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-primary-soft px-12 py-10">
        <Image src="/dentocrafts-logo.png" alt="DentoCrafts" width={168} height={41} priority unoptimized />
        <div>
          <h2 className="text-2xl font-semibold text-primary-strong tracking-tight">
            CraftsHR
          </h2>
          <p className="mt-2 text-sm text-primary-strong/80 max-w-xs">
            Attendance, leave and compliance for the DentoCrafts workforce — in one place.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-strong/80">
            <li className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0" /> Punch in/out with location-verified attendance
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0" /> Automatic, transparent compliance scoring
            </li>
            <li className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0" /> Leave, holidays and shifts for the whole team
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-strong/60">© {new Date().getFullYear()} DentoCrafts</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Image src="/dentocrafts-logo.png" alt="DentoCrafts" width={140} height={34} priority unoptimized />
          </div>

          <h1 className="text-xl font-semibold text-foreground">Sign in to CraftsHR</h1>
          <p className="mt-1 text-sm text-muted">Enter your phone number and PIN to continue.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
            <div>
              <p className="block text-sm font-medium text-foreground mb-1.5">Mobile number</p>
              <NumericKeypad value={phone} onChange={setPhone} maxLength={10} label="Mobile number" />
            </div>

            {quickUnlockAvailable && phone.length === 10 && (
              <div className="rounded-lg border border-primary/30 bg-primary-soft/50 p-3 text-center">
                <button
                  type="button"
                  onClick={onUseQuickUnlock}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-medium py-2 px-4 text-sm disabled:opacity-50 hover:bg-primary-strong"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                  Use quick unlock
                </button>
                <p className="mt-1.5 text-xs text-muted">or sign in with your PIN below</p>
              </div>
            )}
            {quickUnlockMessage && <p className="text-xs text-danger text-center">{quickUnlockMessage}</p>}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-medium text-foreground">4-digit PIN</p>
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
                >
                  {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>
              <NumericKeypad value={pin} onChange={setPin} maxLength={4} mask={!showPin} label="4-digit PIN" />
            </div>

            {error && (
              <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || phone.length !== 10 || pin.length !== 4}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50 transition-colors hover:bg-primary-strong"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-xs text-muted text-center">
              Forgot your PIN? Ask HR to reset it for you.
            </p>
            <p className="text-xs text-muted text-center border-t border-border pt-4">
              New here?{" "}
              <Link href="/register" className="font-medium text-primary-strong hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
