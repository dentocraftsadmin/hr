import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { getTodayAttendance, hasAssignedOffice } from "@/lib/data/attendance";
import { getComplianceScore, getPointsHistory } from "@/lib/data/points";
import { getNotificationPreferences } from "@/lib/data/notifications";
import { getUpcomingBirthdays } from "@/lib/data/birthdays";
import { logout } from "@/server/actions/auth";
import { PunchFlow } from "@/components/attendance/punch-flow";
import { ScoreCard } from "@/components/attendance/score-card";
import { NotificationSettings } from "@/components/attendance/notification-settings";
import { QuickUnlockCard } from "@/components/attendance/quick-unlock-card";
import { UpcomingBirthdays } from "@/components/shared/upcoming-birthdays";
import { EmployeeTour } from "@/components/employee/employee-tour";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.employee) {
    // An admin-only account (no linked employee record) has nothing to
    // show here — send it to the console instead of back to /login, which
    // would just bounce straight back (middleware sends a signed-in user
    // away from /login) and loop.
    redirect(user.role === "admin" ? "/admin" : "/login");
  }

  const [today, score, history, preferences, birthdays, hasOffice] = await Promise.all([
    getTodayAttendance(user.employee.id),
    getComplianceScore(user.employee.id),
    getPointsHistory(user.employee.id),
    getNotificationPreferences(user.employee.id),
    getUpcomingBirthdays(),
    hasAssignedOffice(user.employee.id),
  ]);
  const noOfficeReason = "You're not assigned to an office yet. Contact HR to get punch-in enabled.";
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      {/* An admin who is also a tracked employee can still land on this
          page (nothing else blocks that) — the tour must never auto-show
          for them regardless of their own employee record's state. */}
      <EmployeeTour
        shouldAutoStart={user.role !== "admin" && user.employee.tour_completed_at == null}
        forceStart={user.role !== "admin" && params.tour === "1"}
      />
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6">
          <p className="text-sm text-muted">Welcome back,</p>
          <h1 className="text-xl font-semibold text-foreground">{user.employee.full_name}</h1>
        </div>

        {!today?.punchedIn && (
          <PunchFlow employeeId={user.employee.id} punchType="in" disabled={!hasOffice} disabledReason={noOfficeReason} />
        )}
        {today?.punchedIn && !today.punchedOut && (
          <PunchFlow employeeId={user.employee.id} punchType="out" disabled={!hasOffice} disabledReason={noOfficeReason} />
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

        <ScoreCard score={score} history={history} />

        <UpcomingBirthdays birthdays={birthdays} />

        <NotificationSettings preferences={preferences} />

        <QuickUnlockCard phone={user.employee.phone} />

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
