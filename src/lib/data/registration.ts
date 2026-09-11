import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The public registration page has no session, and offices' "read lookups"
 * RLS policy requires one (`auth.uid() is not null`) -- by design, so a
 * random unauthenticated request can't browse the rest of the schema.
 * Office name/id isn't sensitive on its own (any signed-in employee can
 * already read it), so reading it here with the admin client for the one
 * public page that legitimately needs it is a narrow, server-only
 * exception rather than a change to the RLS policy itself.
 */
export async function listActiveOfficesForRegistration() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offices")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function isRegistrationOpen(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("employee_enrollment_code")
    .eq("id", 1)
    .single();
  return Boolean(data?.employee_enrollment_code?.trim());
}
