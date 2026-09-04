"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      router.replace(result.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-foreground">CraftsHR</h1>
        <p className="mt-1 text-sm text-muted">Sign in with your phone number and PIN.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
              Mobile number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground tracking-wide focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-foreground mb-1">
              4-digit PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground tracking-[0.5em] text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••"
            />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending || phone.length !== 10 || pin.length !== 4}
            className="w-full rounded-lg bg-primary text-white font-medium py-2.5 disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-muted text-center">
            Forgot your PIN? Ask HR to reset it for you.
          </p>
        </form>
      </div>
    </main>
  );
}
