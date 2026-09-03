import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { getTodayAttendance } from "@/lib/data/attendance";
import { logout } from "@/server/actions/auth";
import { PunchFlow } from "@/components/attendance/punch-flow";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.employee) redirect("/login");

  const today = await getTodayAttendance(user.employee.id);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6">
          <p className="text-sm text-muted">Welcome back,</p>
          <h1 className="text-xl font-semibold text-foreground">{user.employee.full_name}</h1>
        </div>

        {!today?.punchedIn && (
          <PunchFlow employeeId={user.employee.id} punchType="in" />
        )}
        {today?.punchedIn && !today.punchedOut && (
          <PunchFlow employeeId={user.employee.id} punchType="out" />
        )}
        {today?.punchedOut && (
          <div className="rounded-lg border border-border bg-primary-soft px-4 py-3 text-sm text-primary-strong">
            <p className="font-medium">Done for today</p>
            <p className="mt-1">
              {today.hoursWorked?.toFixed(2)} hours · {today.dayType.replace("_", " ")}
              {today.isLate ? " · marked late" : ""}
            </p>
          </div>
        )}

        <form action={logout}>
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
