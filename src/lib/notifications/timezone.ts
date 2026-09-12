/** Converts a wall-clock "YYYY-MM-DDTHH:mm" (as an HR user typed it, in the
 * company's configured timezone) to the correct UTC instant — without a
 * date library, using the standard double-format trick: guess the instant
 * as if the numbers were already UTC, ask Intl what that instant actually
 * reads as in the target timezone, and correct by the difference. This is
 * exact for a fixed-offset zone like Asia/Kolkata (no DST) and correct for
 * DST zones too, since the offset used is the one Intl resolves for that
 * specific instant, not a cached/guessed one. */
export function zonedTimeToUtc(dateTimeLocal: string, timeZone: string): Date {
  const [datePart, timePart] = dateTimeLocal.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(utcGuess))
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const asUtcIfLocal = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offset = asUtcIfLocal - utcGuess;
  return new Date(utcGuess - offset);
}

/** The inverse — for pre-filling a "reschedule" input with the currently
 * stored UTC instant, shown back in the company's timezone. */
export function utcToLocalDateTimeInput(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
