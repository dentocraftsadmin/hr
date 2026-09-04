import { listAllLeaveRequests } from "@/lib/data/leave";
import { LeaveReviewList } from "@/components/admin/leave-review";

export default async function AdminLeavePage() {
  const [pending, recent] = await Promise.all([listAllLeaveRequests("pending"), listAllLeaveRequests()]);

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground mb-4">Pending leave requests</h1>
        <LeaveReviewList requests={pending} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All requests</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
          {recent.slice(0, 30).map((r) => {
            const employee = Array.isArray(r.employee) ? r.employee[0] : r.employee;
            const type = Array.isArray(r.leave_type) ? r.leave_type[0] : r.leave_type;
            return (
              <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {employee?.full_name} — {type?.name} ({r.from_date})
                </span>
                <span className="text-xs text-muted">{r.status}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
