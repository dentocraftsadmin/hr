/**
 * Employees are identified by a plain 10-digit Indian mobile number
 * everywhere in the app and in `employees.phone`. Supabase Auth stores
 * `auth.users.phone` as country-code-prefixed digits with **no leading
 * "+"** (confirmed against a real login failure — the client SDK and the
 * stored value must both omit it, or `signInWithPassword` returns a
 * generic "Invalid login credentials" with no indication the phone simply
 * didn't match). These two helpers are the single place this conversion
 * happens, so it can't drift between call sites.
 */

const COUNTRY_CODE = process.env.PHONE_COUNTRY_CODE ?? "91";

const TEN_DIGIT_PHONE = /^[6-9][0-9]{9}$/;

export function isValidPhone(phone: string): boolean {
  return TEN_DIGIT_PHONE.test(phone);
}

/** "9876543210" -> "919876543210" */
export function toE164(phone: string): string {
  return `${COUNTRY_CODE}${phone}`;
}

/** "919876543210" -> "9876543210" */
export function fromE164(e164: string): string {
  return e164.startsWith(COUNTRY_CODE) ? e164.slice(COUNTRY_CODE.length) : e164;
}
