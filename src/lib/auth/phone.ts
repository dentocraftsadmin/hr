/**
 * Employees are identified by a plain 10-digit Indian mobile number
 * everywhere in the app and in `employees.phone`. Supabase Auth stores phone
 * numbers in E.164 form on `auth.users.phone` — these two helpers are the
 * single place that conversion happens, so it can't drift between call sites.
 */

const COUNTRY_CODE = process.env.PHONE_COUNTRY_CODE ?? "+91";

const TEN_DIGIT_PHONE = /^[6-9][0-9]{9}$/;

export function isValidPhone(phone: string): boolean {
  return TEN_DIGIT_PHONE.test(phone);
}

/** "9876543210" -> "+919876543210" */
export function toE164(phone: string): string {
  return `${COUNTRY_CODE}${phone}`;
}

/** "+919876543210" -> "9876543210" */
export function fromE164(e164: string): string {
  return e164.replace(COUNTRY_CODE, "").replace(/^\+\d+/, "");
}
