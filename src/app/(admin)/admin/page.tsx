import { getDashboardStats, listFlaggedAttendanceDays, listRecentArchiveJobs } from "@/lib/data/dashboard";
import { FlaggedAttendanceList } from "@/components/admin/flagged-attendance";

const JOB_STATUS_STYLE: Record<string, string> = {
  completed: "text-primary-strong",
  partially_completed: "text-warning",
  failed: "text-danger",
  running: "text-muted",
  pending: "text-muted",
};

function Tile({ label, value, tone }: { label: string; value: number; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [stats, flagged, archiveJobs] = await Promise.all([
    getDashboardStats(),
    listFlaggedAttendanceDays(),
    listRecentArchiveJobs(),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground mb-4">Today at a glance</h1>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Tile label="Active employees" value={stats.activeEmployees} />
          <Tile label="Punched in today" value={stats.punchedInToday} />
          <Tile label="Late today" value={stats.lateToday} tone={stats.lateToday > 0 ? "warning" : undefined} />
          <Tile label="Pending leave" value={stats.pendingLeave} tone={stats.pendingLeave > 0 ? "warning" : undefined} />
          <Tile label="Score below 70" value={stats.lowScoreCount} tone={stats.lowScoreCount > 0 ? "danger" : undefined} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Needs correction</h2>
        <p className="text-sm text-muted mb-3">
          Incomplete punches (punched in, never out) and other flagged days — resolving one clears the flag and logs why.
        </p>
        <FlaggedAttendanceList rows={flagged} />
      </div>

      {archiveJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Photo archive</h2>
          <p className="text-sm text-muted mb-3">Monthly job that moves punch selfies to Google Drive.</p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface text-sm">
            {archiveJobs.map((job) => (
              <li key={job.period_month} className="flex items-center justify-between px-4 py-2.5">
                <span>{job.period_month}</span>
                <span className="text-muted">
                  {job.archived_count} archived{job.failed_count > 0 ? `, ${job.failed_count} failed` : ""}
                </span>
                <span className={`font-medium ${JOB_STATUS_STYLE[job.status] ?? ""}`}>{job.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
