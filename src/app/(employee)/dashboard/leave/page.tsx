import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { listLeaveTypes, listHolidays, getLeaveBalances, listOwnLeaveRequests } from "@/lib/data/leave";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveHistory } from "@/components/leave/leave-history";

export default async function EmployeeLeavePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.employee) redirect(user.role === "admin" ? "/admin" : "/login");

  const [leaveTypes, holidays, balances, requests] = await Promise.all([
    listLeaveTypes(),
    listHolidays(),
    getLeaveBalances(user.employee.id),
    listOwnLeaveRequests(user.employee.id),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {balances.map((b) => (
            <div key={b.leaveTypeId} className="rounded-lg border border-border bg-surface p-3 text-center">
              <p className="text-xs text-muted">{b.name}</p>
              <p className="text-lg font-semibold text-foreground">{b.remaining}</p>
              <p className="text-xs text-muted">of {b.quota}</p>
            </div>
          ))}
        </div>

        <LeaveRequestForm leaveTypes={leaveTypes} />

        {holidays.length > 0 && (
          <div className="rounded-lg border border-border bg-surface p-4">
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
