/**
 * Supabase Auth enforces a hard floor of 6 characters on password_min_length
 * (its Management API rejects anything lower) — but the product requirement
 * is an exactly-4-digit PIN. This prefix bridges the two: employees only
 * ever see/type 4 digits anywhere in the UI; every place a PIN is sent to
 * Supabase Auth as a password goes through this transform first, so the
 * stored credential satisfies Supabase's own minimum without changing the
 * user-facing requirement at all.
 */
const PIN_PREFIX = "pin-";

export function toAuthPassword(pin: string): string {
  return `${PIN_PREFIX}${pin}`;
}
