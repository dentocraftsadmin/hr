import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (camera/GPS capture, interactive
 * forms). Still bound to the signed-in user's session — RLS applies the same
 * as on the server.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
