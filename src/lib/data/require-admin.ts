import { createClient } from "@/lib/supabase/server";

/**
 * Every admin-only server action calls this first. Returns the caller's auth
 * id + a bound Supabase client on success. This is a UX/defense-in-depth
 * check, not the real boundary — RLS's `is_admin()` still enforces the same
 * rule at the database regardless of whether a server action forgets to call
 * this.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Not authorized." };
  }

  return { ok: true as const, supabase, authId: user.id };
}
