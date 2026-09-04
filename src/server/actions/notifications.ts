"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionSchema, notificationPreferencesSchema } from "@/lib/validation/notifications";
import type { ActionResult } from "./auth";

async function requireEmployee() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("employee_id").eq("id", user.id).single();
  if (!profile?.employee_id) return null;
  return { supabase, employeeId: profile.employee_id as string };
}

export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid subscription." };

  const { error } = await ctx.supabase.from("push_subscriptions").upsert(
    {
      employee_id: ctx.employeeId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
      user_agent: null,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: "Could not save the subscription." };

  await ctx.supabase
    .from("notification_preferences")
    .upsert({ employee_id: ctx.employeeId, push_enabled: true }, { onConflict: "employee_id" });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };

  await ctx.supabase.from("push_subscriptions").delete().eq("employee_id", ctx.employeeId).eq("endpoint", endpoint);
  await ctx.supabase
    .from("notification_preferences")
    .upsert({ employee_id: ctx.employeeId, push_enabled: false }, { onConflict: "employee_id" });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateNotificationPreferences(formData: FormData): Promise<ActionResult> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const parsed = notificationPreferencesSchema.safeParse({
    push_enabled: formData.get("push_enabled") === "on",
    remind_punch_in: formData.get("remind_punch_in") === "on",
    remind_punch_in_minutes_before: formData.get("remind_punch_in_minutes_before"),
    remind_punch_out: formData.get("remind_punch_out") === "on",
    remind_missed_punch: formData.get("remind_missed_punch") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error } = await ctx.supabase
    .from("notification_preferences")
    .upsert({ employee_id: ctx.employeeId, ...parsed.data }, { onConflict: "employee_id" });
  if (error) return { ok: false, error: "Could not save preferences." };

  revalidatePath("/dashboard");
  return { ok: true };
}
