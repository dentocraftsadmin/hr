/**
 * Shared fallback for every /admin/* route while its Server Component data
 * loads. One generic skeleton for now (Phase 2, performance) rather than a
 * per-page one — page-specific loading states land with the Phase 3/4
 * visual redesign. This exists purely so navigation gives instant visual
 * feedback instead of a frozen screen; it must never be used to paper over
 * slow code that should be fixed instead.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-6 w-40 rounded bg-border/60" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4 h-20" />
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 px-4 flex items-center">
            <div className="h-3 w-1/3 rounded bg-border/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
