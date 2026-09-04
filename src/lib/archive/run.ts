import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureFolder, uploadFile, getFileSize, isDriveConfigured } from "./google-drive";
import { punchPhotoFilename, employeeZipFilename } from "./filename";

type EventRow = { id: string; employee_id: string; server_recorded_at: string; photo_temp_path: string };

export type ArchiveResult =
  | { skipped: true; reason: string }
  | { skipped: false; archived: number; failed: number };

/**
 * One employee's month of photos -> one ZIP -> one Drive upload -> verify
 * size -> only then delete the temp copies. A failure for one employee
 * never touches another's, and never deletes anything unverified — the
 * next run picks up exactly what's still `photo_status = 'uploaded'`.
 */
export async function runPhotoArchive(periodMonth: string): Promise<ArchiveResult> {
  if (!isDriveConfigured()) {
    return { skipped: true, reason: "Google Drive is not configured yet (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_DRIVE_ROOT_FOLDER_ID)" };
  }

  const admin = createAdminClient();

  const { data: existingJob } = await admin
    .from("photo_archive_jobs")
    .select("id, status")
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (existingJob?.status === "running") return { skipped: true, reason: "already running" };
  if (existingJob?.status === "completed") return { skipped: true, reason: "already completed" };

  let jobId = existingJob?.id;
  if (jobId) {
    await admin.from("photo_archive_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", jobId);
  } else {
    const { data } = await admin
      .from("photo_archive_jobs")
      .insert({ period_month: periodMonth, status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();
    jobId = data!.id;
  }

  const { data: settings } = await admin.from("app_settings").select("timezone").eq("id", 1).single();
  const timeZone = settings?.timezone ?? "Asia/Kolkata";

  const [year, month] = periodMonth.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

  const { data: events } = await admin
    .from("attendance_events")
    .select("id, employee_id, server_recorded_at, photo_temp_path")
    .eq("photo_status", "uploaded")
    .not("photo_temp_path", "is", null)
    .gte("server_recorded_at", periodMonth)
    .lt("server_recorded_at", nextMonth);

  const byEmployee = new Map<string, EventRow[]>();
  for (const ev of (events ?? []) as EventRow[]) {
    const list = byEmployee.get(ev.employee_id) ?? [];
    list.push(ev);
    byEmployee.set(ev.employee_id, list);
  }

  let archived = 0;
  let failed = 0;
  const errorLog: { employeeId: string; error: string }[] = [];

  if (byEmployee.size > 0) {
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    const yearFolder = await ensureFolder(rootId, String(year));
    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long" });
    const monthFolder = await ensureFolder(yearFolder, monthName);

    for (const [employeeId, empEvents] of byEmployee) {
      try {
        const { data: employee } = await admin
          .from("employees")
          .select("full_name, birth_year")
          .eq("id", employeeId)
          .single();

        const zip = new JSZip();
        const used = new Set<string>();
        const includedIds: string[] = [];
        const includedPaths: string[] = [];

        for (const ev of empEvents) {
          const { data: fileData, error } = await admin.storage.from("punch-photos-temp").download(ev.photo_temp_path);
          if (error || !fileData) continue; // missing temp file — skip it, don't fail the whole employee
          const buffer = Buffer.from(await fileData.arrayBuffer());
          const filename = punchPhotoFilename(new Date(ev.server_recorded_at), timeZone, used);
          zip.file(filename, buffer);
          includedIds.push(ev.id);
          includedPaths.push(ev.photo_temp_path);
        }
        if (includedIds.length === 0) continue;

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
        const zipName = employeeZipFilename(employee?.full_name ?? "Unknown", employee?.birth_year ?? null);
        const driveFileId = await uploadFile(monthFolder, zipName, zipBuffer);

        const remoteSize = await getFileSize(driveFileId);
        if (remoteSize !== zipBuffer.length) {
          throw new Error(`Uploaded size ${remoteSize} did not match local size ${zipBuffer.length}`);
        }

        await admin
          .from("attendance_events")
          .update({ photo_status: "archived", photo_archive_ref: driveFileId })
          .in("id", includedIds);
        await admin.storage.from("punch-photos-temp").remove(includedPaths);

        archived += includedIds.length;
      } catch (e) {
        // Deliberately leave photo_status as 'uploaded' — the temp file is
        // still there, and the next run will retry this employee from
        // scratch. Never mark a failure as terminal.
        failed += empEvents.length;
        errorLog.push({ employeeId, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  const status = failed === 0 ? "completed" : archived > 0 ? "partially_completed" : "failed";
  await admin
    .from("photo_archive_jobs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      total_photos: archived + failed,
      archived_count: archived,
      failed_count: failed,
      error_log: errorLog.length ? errorLog : null,
    })
    .eq("id", jobId);

  return { skipped: false, archived, failed };
}
