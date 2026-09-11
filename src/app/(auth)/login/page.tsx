"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ShieldCheck, Clock, Users } from "lucide-react";
import { login } from "@/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const phoneId = useId();
  const pinId = useId();

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

  return (
    <main className="min-h-screen flex bg-background">
      {/* Brand panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between bg-primary-soft px-12 py-10">
        <Image src="/dentocrafts-logo.png" alt="DentoCrafts" width={168} height={41} priority />
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
            <Image src="/dentocrafts-logo.png" alt="DentoCrafts" width={140} height={34} priority />
          </div>

          <h1 className="text-xl font-semibold text-foreground">Sign in to CraftsHR</h1>
          <p className="mt-1 text-sm text-muted">Enter your phone number and PIN to continue.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor={phoneId} className="block text-sm font-medium text-foreground mb-1.5">
                Mobile number
              </label>
              <input
                id={phoneId}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="9876543210"
              />
            </div>

            <div>
              <label htmlFor={pinId} className="block text-sm font-medium text-foreground mb-1.5">
                4-digit PIN
              </label>
              <div className="relative">
                <input
                  id={pinId}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={4}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-10 text-foreground tracking-[0.5em] text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
          </form>
        </div>
      </div>
    </main>
  );
}
