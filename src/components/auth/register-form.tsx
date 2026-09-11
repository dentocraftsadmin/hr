"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { registerEmployee } from "@/server/actions/registration";
import { FormSection, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

type Office = { id: string; name: string };

export function RegisterForm({ offices }: { offices: Office[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await registerEmployee(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-foreground">You&rsquo;re all set</h1>
        <p className="mt-1 text-sm text-muted">
          Your account was created. Sign in with your phone number and the PIN you just chose.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.replace("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-sm p-8">
      <h1 className="text-xl font-semibold text-foreground">Create your CraftsHR account</h1>
      <p className="mt-1 text-sm text-muted">
        Ask HR for the company registration code if you don&rsquo;t have one.
      </p>

      <form action={onSubmit} className="mt-6 space-y-6">
        <FormSection title="Personal information">
          <Field label="Full name" htmlFor="full_name" required>
            <Input id="full_name" name="full_name" required placeholder="Jane Doe" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile number" htmlFor="phone" required description="10 digits, no country code">
              <Input id="phone" name="phone" required inputMode="numeric" maxLength={10} placeholder="9876543210" />
            </Field>
            <Field label="Birth year" htmlFor="birth_year" required>
              <Input id="birth_year" name="birth_year" type="number" required min={1940} max={new Date().getFullYear()} placeholder="1995" />
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Choose a PIN" htmlFor="pin" required description="4 digits">
              <Input id="pin" name="pin" type="password" required inputMode="numeric" maxLength={4} className="tracking-widest" />
            </Field>
            <Field label="Confirm PIN" htmlFor="confirm_pin" required>
              <Input id="confirm_pin" name="confirm_pin" type="password" required inputMode="numeric" maxLength={4} className="tracking-widest" />
            </Field>
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
