import { listEmployeeScores } from "@/lib/data/points";
import { ScoreTable } from "@/components/admin/score-table";

export default async function AdminPointsPage() {
  const employees = await listEmployeeScores();
  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">Compliance scores</h1>
      <p className="text-sm text-muted mb-4">
        0–100, automatic from attendance. Adjustments require a reason and are visible to the employee.
      </p>
      <ScoreTable employees={employees} />
    </div>
  );
}
