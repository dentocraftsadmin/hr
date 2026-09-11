import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import {
  listLeaveTypes,
  listHolidays,
  listOwnLeaveRequests,
  getLeaveNoticeDays,
  getEmployeeWorkingDays,
  getApplicableHolidayDates,
} from "@/lib/data/leave";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveHistory } from "@/components/leave/leave-history";

export default async function EmployeeLeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.employee) redirect(user.role === "admin" ? "/admin" : "/login");

  const [leaveTypes, holidays, requests, noticeDays, workingDays, applicableHolidayDates] = await Promise.all([
    listLeaveTypes(),
    listHolidays(),
    listOwnLeaveRequests(user.employee.id),
    getLeaveNoticeDays(),
    getEmployeeWorkingDays(user.employee.id),
    getApplicableHolidayDates(user.employee.id),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <LeaveRequestForm
          leaveTypes={leaveTypes}
          workingDays={workingDays}
          holidayDates={applicableHolidayDates}
          noticeDays={noticeDays}
        />

        {holidays.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-medium text-foreground mb-2">Upcoming holidays</h2>
            <ul className="space-y-1 text-sm text-muted">
              {holidays.slice(0, 5).map((h) => (
                <li key={h.id}>
                  {h.date} — {h.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-medium text-foreground mb-2">Your requests</h2>
          <LeaveHistory requests={requests} />
        </div>
      </div>
    </main>
  );
}
