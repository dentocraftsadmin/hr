import Link from "next/link";
import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import { listActiveOfficesForRegistration, isRegistrationOpen } from "@/lib/data/registration";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  const [open, offices] = await Promise.all([isRegistrationOpen(), listActiveOfficesForRegistration()]);
  const canRegister = open && offices.length > 0;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image src="/dentocrafts-logo.png" alt="DentoCrafts" width={140} height={34} priority />
        </div>

        {!canRegister ? (
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-warning-soft">
              <ShieldAlert className="h-5 w-5 text-warning" />
            </div>
            <h1 className="mt-4 text-lg font-semibold text-foreground">Registration isn&rsquo;t open yet</h1>
            <p className="mt-1 text-sm text-muted">
              Ask HR for the current registration code, or for an admin to add one first.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary-strong hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <RegisterForm offices={offices} />
        )}
      </div>
    </main>
  );
}
