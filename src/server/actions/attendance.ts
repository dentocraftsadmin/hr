"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { submitPunchSchema, type SubmitPunchInput } from "@/lib/validation/attendance";

export type PunchResult =
  | {
      ok: true;
      data: {
        locationStatus: "at_office" | "away_from_office";
        distanceMeters: number | null;
        officeName: string | null;
        isLate: boolean | null;
        dayType: string;
        hoursWorked: number | null;
      };
    }
  | { ok: false; error: string };

/**
 * Thin wrapper around the submit_punch() database function — GPS/selfie
 * validation, distance, lateness, day-type, and automatic points are all
 * computed inside that SECURITY DEFINER function from server time, not
 * here. This action exists to validate input shape and translate Postgres
 * errors into messages an employee can act on.
 */
export async function submitPunch(input: SubmitPunchInput): Promise<PunchResult> {
  const parsed = submitPunchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("submit_punch", {
    p_event_type: data.eventType,
    p_client_captured_at: data.clientCapturedAt,
    p_latitude: data.latitude,
    p_longitude: data.longitude,
    p_gps_accuracy_meters: data.gpsAccuracyMeters,
    p_device_info: data.deviceInfo,
    p_client_request_id: data.clientRequestId,
    p_photo_temp_path: data.photoTempPath,
  });

  if (error) {
    const message = error.message.includes("Already punched in")
      ? "You're already punched in — punch out first."
      : error.message.includes("No open punch-in")
        ? "No punch-in found for today, so there's nothing to punch out from."
        : error.message.includes("not assigned to any office")
          ? "You're not assigned to an office yet. Contact HR."
          : "Could not record the punch. Try again.";
    return { ok: false, error: message };
  }

  const row = rows?.[0];
  if (!row) return { ok: false, error: "Could not record the punch. Try again." };

  revalidatePath("/dashboard");
  return {
    ok: true,
    data: {
      locationStatus: row.location_status,
      distanceMeters: row.distance_from_office_meters,
      officeName: row.office_name,
      isLate: row.is_late,
      dayType: row.day_type,
      hoursWorked: row.hours_worked,
    },
  };
}
