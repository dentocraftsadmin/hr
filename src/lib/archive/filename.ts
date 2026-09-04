/** DD-MM-YYYY-HH-MM-SS.jpg, from the actual punch/capture timestamp — never
 * the archive job's run time. `used` tracks names already assigned in the
 * current batch so a same-second collision gets a minimal numeric suffix
 * while the timestamp stays the primary, readable part of the filename. */
export function punchPhotoFilename(capturedAt: Date, timeZone: string, used: Set<string>): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(capturedAt)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});

  const base = `${parts.day}-${parts.month}-${parts.year}-${parts.hour}-${parts.minute}-${parts.second}`;
  let filename = `${base}.jpg`;
  let suffix = 2;
  while (used.has(filename)) {
    filename = `${base}-${suffix}.jpg`;
    suffix += 1;
  }
  used.add(filename);
  return filename;
}

/** "Full Name - 1994.zip" — sanitized so the name is always a valid,
 * unsurprising filename regardless of what's in the employee record. */
export function employeeZipFilename(fullName: string, birthYear: number | null): string {
  const safeName = fullName.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${safeName}${birthYear ? ` - ${birthYear}` : ""}.zip`;
}
