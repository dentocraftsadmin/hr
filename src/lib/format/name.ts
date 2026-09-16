/**
 * The one place a person's name gets cased consistently — applied at write
 * time (registration, employee create/update) so stored data is already
 * correct, and again at the handful of read paths that surface a name in
 * the UI/exports, as a safety net for anything not written through those
 * paths. Idempotent: an already-correctly-cased name passes through
 * unchanged, so applying it twice (write then read) is harmless.
 *
 * Splits on hyphens and apostrophes too, so "mary-jane o'brien" becomes
 * "Mary-Jane O'Brien" rather than "Mary-jane O'brien" — this is plain
 * word-level title casing, not name-specific heuristics (no attempt at
 * "McDonald"-style casing), matching only what was actually asked for.
 */
export function formatPersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => capitalizeHyphenated(word))
    .join(" ");
}

function capitalizeHyphenated(word: string): string {
  return word
    .split("-")
    .map((part) => part.split("'").map(capitalizeSegment).join("'"))
    .join("-");
}

function capitalizeSegment(segment: string): string {
  if (segment.length === 0) return segment;
  return segment[0].toUpperCase() + segment.slice(1).toLowerCase();
}
