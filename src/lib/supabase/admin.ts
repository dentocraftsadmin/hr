import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely — never import this into
 * anything that runs in the browser, and never pass its result back to a
 * client component. Reserved for the specific admin-only operations that
 * must manage Supabase Auth users directly:
 *   - creating the auth user for a new employee (registration)
 *   - resetting an employee's PIN (HR action, "forgot PIN")
 * Everything else should go through lib/supabase/server.ts so RLS still
 * applies.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
