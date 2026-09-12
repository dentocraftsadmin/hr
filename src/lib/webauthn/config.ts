import { headers } from "next/headers";

/** Derives the WebAuthn Relying Party ID (bare domain, no scheme/port) and
 * origin from the incoming request rather than a hardcoded value, so this
 * keeps working across localhost, any Vercel preview URL, and production
 * without a new app_settings/env entry to keep in sync. */
export async function getRpConfig() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const rpID = host.split(":")[0];
  const origin = `${proto}://${host}`;
  return { rpID, rpName: "CraftsHR", origin };
}
