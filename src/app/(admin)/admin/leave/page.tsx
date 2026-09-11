import Link from "next/link";
import { Hourglass, CheckCircle2, XCircle, CalendarDays, Info } from "lucide-react";
import { listAllLeaveRequests } from "@/lib/data/leave";
import { getLeaveNoticePolicy } from "@/server/actions/leave-policy";
import { LeaveReviewList } from "@/components/admin/leave-review";
import { LeaveNoticePolicyCard } from "@/components/admin/leave-notice-policy";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "neutral",
};

export default async function AdminLeavePage() {
  const [pending, recent, { days }] = await Promise.all([
    listAllLeaveRequests("pending"),
    listAllLeaveRequests(),
    getLeaveNoticePolicy(),
  ]);

  const approved = recent.filter((r) => r.status === "approved").length;
  const rejected = recent.filter((r) => r.status === "rejected").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leave"
        description="Review pending requests and keep track of approvals across the team."
        actions={
          <Link href="/rules#leave" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-strong">
            <Info className="h-4 w-4" /> How leave is scored
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
        <StatCard label="Pending" value={pending.length} icon={Hourglass} tone={pending.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} tone="neutral" />
      </div>

      <div className="max-w-lg">
        <LeaveNoticePolicyCard initialDays={days} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Pending requests</h2>
          <LeaveReviewList requests={pending} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Recent activity</h2>
          {recent.length === 0 ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="No leave requests"
                description="Requests submitted by employees will show up here for review."
              />
            </Card>
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {recent.slice(0, 30).map((r) => {
                const employee = Array.isArray(r.employee) ? r.employee[0] : r.employee;
                const type = Array.isArray(r.leave_type) ? r.leave_type[0] : r.leave_type;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{employee?.full_name}</p>
                      <p className="text-muted text-xs">{type?.name} · {r.from_date}</p>
                    </div>
                    <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
