/**
 * Shared fallback for /dashboard and /dashboard/leave while their Server
 * Component data loads. Functional placeholder for Phase 2 (performance);
 * a page-specific version lands with the Phase 3/4 visual redesign.
 */
export default function EmployeeLoading() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-4 animate-pulse" aria-busy="true" aria-live="polite">
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 space-y-2">
          <div className="h-3 w-24 rounded bg-border/60" />
          <div className="h-5 w-40 rounded bg-border/60" />
        </div>
        <div className="bg-surface border border-border rounded-2xl shadow-sm h-32" />
        <div className="bg-surface border border-border rounded-2xl shadow-sm h-24" />
      </div>
    </main>
  );
}
