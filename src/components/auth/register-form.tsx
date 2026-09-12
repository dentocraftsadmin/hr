"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, BellRing, ShieldAlert, BellOff } from "lucide-react";
import { registerEmployee } from "@/server/actions/registration";
import { subscribeToPush } from "@/lib/notifications/subscribe";
import { FormSection, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { NumericKeypad } from "@/components/ui/numeric-keypad";

type Office = { id: string; name: string };
type Step = "form" | "notifications" | "success";
type NotifState = "idle" | "requesting" | "denied" | "unsupported" | "error" | "submitting";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function RegisterForm({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [notifState, setNotifState] = useState<NotifState>("idle");
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setError("Enter a 4-digit PIN and confirm it.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN and confirmation do not match.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("phone", phone);
    fd.set("pin", pin);
    fd.set("confirm_pin", confirmPin);
    setPendingFormData(fd);
    setNotifState("idle");
    setNotifMessage(null);
    setStep("notifications");
  }

  function enableNotifications() {
    setNotifState("requesting");
    setNotifMessage(null);
    startTransition(async () => {
      const result = await subscribeToPush();
      if (!result.ok) {
        setNotifState(result.reason);
        setNotifMessage(result.message);
        return;
      }

      setNotifState("submitting");
      const fd = pendingFormData;
      if (!fd) {
        setNotifState("error");
        setNotifMessage("Something went wrong — please start over.");
        return;
      }
      fd.set("push_subscription", JSON.stringify(result.subscription));
      const res = await registerEmployee(fd);
      if (!res.ok) {
        setError(res.error);
        setStep("form");
        return;
      }
      setStep("success");
    });
  }

  if (step === "success") {
    return (
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">You&rsquo;re all set</h1>
        <p className="mt-1 text-sm text-muted">
          Your account was created and notifications are on. A test notification should arrive shortly. Sign in with
          your phone number and the PIN you just chose.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.replace("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  if (step === "notifications") {
    return (
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">
        {(notifState === "idle" || notifState === "requesting" || notifState === "submitting") && (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
              <BellRing className="h-5 w-5 text-primary-strong" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">Turn on notifications</h1>
            <p className="mt-1 text-sm text-muted">
              CraftsHR requires notifications to be enabled so you get punch-in, punch-out, and leave reminders.
              You&rsquo;ll be asked to allow notifications for this site — this is required to finish creating your
              account.
            </p>
            <Button
              className="mt-5 w-full"
              onClick={enableNotifications}
              disabled={notifState === "requesting" || notifState === "submitting" || isPending}
            >
              {(notifState === "requesting" || notifState === "submitting") && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {notifState === "submitting" ? "Creating your account…" : "Enable notifications"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={notifState === "requesting" || notifState === "submitting"}
              className="mt-3 text-xs text-muted hover:underline disabled:opacity-50"
            >
              Back to edit your details
            </button>
          </>
        )}

        {notifState === "denied" && (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
              <ShieldAlert className="h-5 w-5 text-danger" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">Notifications are required</h1>
            <p className="mt-1 text-sm text-muted">{notifMessage}</p>
            <p className="mt-2 text-xs text-muted">
              Registration can&rsquo;t continue until notifications are allowed for this site. Open your
              browser or device settings, allow notifications, then come back here.
            </p>
            <Button className="mt-5 w-full" onClick={enableNotifications}>
              I&rsquo;ve enabled it — Try again
            </Button>
            <button type="button" onClick={() => setStep("form")} className="mt-3 text-xs text-muted hover:underline">
              Back to edit your details
            </button>
          </>
        )}

        {notifState === "unsupported" && (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
              <BellOff className="h-5 w-5 text-danger" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">This browser isn&rsquo;t supported</h1>
            <p className="mt-1 text-sm text-muted">{notifMessage}</p>
            <p className="mt-2 text-xs text-muted">
              CraftsHR requires a browser that supports push notifications to register. Try a recent version of
              Chrome, Edge, or Firefox, or a different device.
            </p>
            <button type="button" onClick={() => setStep("form")} className="mt-5 text-xs text-muted hover:underline">
              Back to edit your details
            </button>
          </>
        )}

        {notifState === "error" && (
          <>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
              <ShieldAlert className="h-5 w-5 text-danger" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">Couldn&rsquo;t set up notifications</h1>
            <p className="mt-1 text-sm text-muted">{notifMessage}</p>
            <Button className="mt-5 w-full" onClick={enableNotifications}>
              Try again
            </Button>
            <button type="button" onClick={() => setStep("form")} className="mt-3 text-xs text-muted hover:underline">
              Back to edit your details
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-sm p-8">
      <h1 className="text-xl font-semibold text-foreground">Create your CraftsHR account</h1>
      <p className="mt-1 text-sm text-muted">
        Ask HR for the company registration code if you don&rsquo;t have one.
      </p>

      <form onSubmit={onFormSubmit} className="mt-6 space-y-6">
        <FormSection title="Personal information">
          <Field label="Full name" htmlFor="full_name" required>
            <Input id="full_name" name="full_name" required placeholder="Jane Doe" />
          </Field>

          <div>
            <p className="block text-sm font-medium text-foreground mb-1.5">
              Mobile number <span className="text-danger">*</span>
            </p>
            <NumericKeypad value={phone} onChange={setPhone} maxLength={10} label="Mobile number" />
            <p className="mt-1 text-xs text-muted text-center">10 digits, no country code</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Birth month" htmlFor="birth_month" required>
              <Select id="birth_month" name="birth_month" required defaultValue="">
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Birth day" htmlFor="birth_day" required>
              <Input id="birth_day" name="birth_day" type="number" required min={1} max={31} placeholder="15" />
            </Field>
            <Field label="Birth year" htmlFor="birth_year" required>
              <Input
                id="birth_year"
                name="birth_year"
                type="number"
                required
                min={1940}
                max={new Date().getFullYear()}
                placeholder="1995"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Company enrollment">
          <Field label="Registration code" htmlFor="enrollment_code" required description="Provided by HR">
            <Input id="enrollment_code" name="enrollment_code" required autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Joining date" htmlFor="joining_date" required>
              <Input id="joining_date" name="joining_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Office" htmlFor="office_id" required>
              <Select id="office_id" name="office_id" required defaultValue="">
                <option value="" disabled>Select office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Credentials">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="block text-sm font-medium text-foreground mb-1.5 text-center">
                Choose a PIN <span className="text-danger">*</span>
              </p>
              <NumericKeypad value={pin} onChange={setPin} maxLength={4} mask label="Choose a 4-digit PIN" />
            </div>
            <div>
              <p className="block text-sm font-medium text-foreground mb-1.5 text-center">
                Confirm PIN <span className="text-danger">*</span>
              </p>
              <NumericKeypad value={confirmPin} onChange={setConfirmPin} maxLength={4} mask label="Confirm your PIN" />
            </div>
          </div>
        </FormSection>

        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>

        <p className="text-xs text-muted text-center">
          Already have an account? <Link href="/login" className="text-primary-strong hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
