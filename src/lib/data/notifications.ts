import { createClient } from "@/lib/supabase/server";

const DEFAULTS = {
  push_enabled: false,
  remind_punch_in: true,
  remind_punch_in_minutes_before: 15,
  remind_punch_out: true,
  remind_missed_punch: true,
  remind_missed_punch_out: true,
};

export async function getNotificationPreferences(employeeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();
  return data ?? DEFAULTS;
}
