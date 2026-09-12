import { Users, LogIn, AlarmClock, CalendarClock, TrendingDown, Archive } from "lucide-react";
import { getDashboardStats, listFlaggedAttendanceDays, listRecentArchiveJobs } from "@/lib/data/dashboard";
import { getUpcomingBirthdays } from "@/lib/data/birthdays";
import { FlaggedAttendanceList } from "@/components/admin/flagged-attendance";
import { UpcomingBirthdays } from "@/components/shared/upcoming-birthdays";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const JOB_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  completed: "success",
  partially_completed: "warning",
  failed: "danger",
  running: "neutral",
  pending: "neutral",
};

export default async function AdminDashboardPage() {
  const [stats, flagged, archiveJobs, birthdays] = await Promise.all([
    getDashboardStats(),
    listFlaggedAttendanceDays(),
    listRecentArchiveJobs(),
    getUpcomingBirthdays(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Today's workforce snapshot for DentoCrafts — attendance, leave, and compliance at a glance."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Active employees" value={stats.activeEmployees} icon={Users} />
        <StatCard label="Punched in today" value={stats.punchedInToday} icon={LogIn} tone="success" />
        <StatCard
          label="Late today"
          value={stats.lateToday}
          icon={AlarmClock}
          tone={stats.lateToday > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Pending leave"
          value={stats.pendingLeave}
          icon={CalendarClock}
          tone={stats.pendingLeave > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Score below 70"
          value={stats.lowScoreCount}
          icon={TrendingDown}
          tone={stats.lowScoreCount > 0 ? "danger" : "neutral"}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold text-foreground">Needs correction</h2>
        <p className="mt-0.5 text-sm text-muted mb-3">
          Incomplete punches (punched in, never out) and other flagged days — resolving one clears the flag and logs why.
        </p>
        <Card className="p-4">
          <FlaggedAttendanceList rows={flagged} />
        </Card>
      </div>

      <UpcomingBirthdays birthdays={birthdays} />

      {archiveJobs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive className="h-4 w-4 text-muted" />
            <h2 className="text-base font-semibold text-foreground">Photo archive</h2>
          </div>
          <p className="text-sm text-muted mb-3">Monthly job that moves punch selfies to Google Drive.</p>
          <Card className="divide-y divide-border overflow-hidden">
            {archiveJobs.map((job) => (
              <div key={job.period_month} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-foreground">{job.period_month}</span>
                <span className="text-muted">
                  {job.archived_count} archived{job.failed_count > 0 ? `, ${job.failed_count} failed` : ""}
                </span>
                <Badge tone={JOB_STATUS_TONE[job.status] ?? "neutral"}>{job.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
