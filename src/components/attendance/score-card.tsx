type Entry = {
  id: string;
  points: number;
  reason: string;
  is_override: boolean;
  created_at: string;
  point_rule: { description: string } | { description: string }[] | null;
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-primary-strong";
  if (score >= 70) return "text-warning";
  return "text-danger";
}

export function ScoreCard({ score, history }: { score: number; history: Entry[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium text-foreground">Compliance score</h2>
        <span className={`text-2xl font-semibold ${scoreColor(score)}`}>{score}</span>
      </div>
      {history.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {history.slice(0, 8).map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-muted">
              <span>
                {entry.reason}
                {entry.is_override ? " (HR adjustment)" : ""}
              </span>
              <span className={entry.points < 0 ? "text-danger" : "text-primary-strong"}>
                {entry.points > 0 ? "+" : ""}
                {entry.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
