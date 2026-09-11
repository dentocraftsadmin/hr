import Link from "next/link";
import { ShieldCheck, TrendingDown, Award, Info } from "lucide-react";
import { listEmployeeScores } from "@/lib/data/points";
import { ScoreTable } from "@/components/admin/score-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminPointsPage() {
  const employees = await listEmployeeScores();

  const average = employees.length
    ? Math.round(employees.reduce((sum, e) => sum + e.score, 0) / employees.length)
    : 0;
  const belowSeventy = employees.filter((e) => e.score < 70).length;
  const perfect = employees.filter((e) => e.score === 100).length;

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="0–100 compliance scores, computed automatically from attendance. Adjustments require a reason and stay visible to the employee."
        actions={
          <Link href="/rules#score" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-strong">
            <Info className="h-4 w-4" /> How scoring works
          </Link>
        }
      />

      {employees.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-w-lg">
          <StatCard label="Average score" value={average} icon={ShieldCheck} />
          <StatCard label="Below 70" value={belowSeventy} icon={TrendingDown} tone={belowSeventy > 0 ? "danger" : "neutral"} />
          <StatCard label="Perfect score" value={perfect} icon={Award} tone={perfect > 0 ? "success" : "neutral"} />
        </div>
      )}

      {employees.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={ShieldCheck}
            title="No active employees yet"
            description="Compliance scores appear here once employees are added and start punching in."
          />
        </div>
      ) : (
        <ScoreTable employees={employees} />
      )}
    </div>
  );
}
