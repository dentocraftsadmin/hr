import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { logout } from "@/server/actions/auth";

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">HR Console</h1>
          <form action={logout}>
            <button type="submit" className="text-sm text-muted underline">
              Sign out
            </button>
          </form>
        </div>
        <p className="mt-2 text-sm text-muted">
          Employees, offices, shifts, attendance, leave and reports land here as each
          milestone is built.
        </p>
      </div>
    </main>
  );
}
