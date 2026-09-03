import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { logout } from "@/server/actions/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.employee) redirect("/login");

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto bg-surface border border-border rounded-2xl shadow-sm p-6">
        <p className="text-sm text-muted">Welcome back,</p>
        <h1 className="text-xl font-semibold text-foreground">{user.employee.full_name}</h1>
        <p className="mt-1 text-sm text-muted">{user.employee.phone}</p>

        <div className="mt-6 rounded-lg bg-primary-soft text-primary-strong text-sm px-4 py-3">
          Punch, leave, and score history land here as the attendance engine is built.
        </div>

        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg border border-border text-foreground font-medium py-2.5"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
