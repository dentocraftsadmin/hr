import { JWT } from "google-auth-library";

/** True once GOOGLE_SERVICE_ACCOUNT_EMAIL/PRIVATE_KEY/DRIVE_ROOT_FOLDER_ID
 * are all set. Everything in this module is a safe no-op path until then —
 * the archive job checks this before doing any work, and never deletes a
 * temp photo it hasn't verified made it to Drive. */
export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  );
}

let client: JWT | null = null;
function getClient(): JWT {
  if (client) return client;
  client = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return client;
}

async function driveFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const c = getClient();
  const { token } = await c.getAccessToken();
  return fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
}

/** Finds a folder by exact name under `parentId`, creating it if it doesn't
 * exist yet. Idempotent — safe to call every run without creating dupes. */
export async function ensureFolder(parentId: string, name: string): Promise<string> {
  const q = encodeURIComponent(
    `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const found = await driveFetch(`files?q=${q}&fields=files(id)`);
  const foundJson = (await found.json()) as { files?: { id: string }[] };
  if (foundJson.files?.[0]) return foundJson.files[0].id;

  const created = await driveFetch("files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  const createdJson = (await created.json()) as { id: string };
  return createdJson.id;
}

/** Multipart upload — small metadata part + the file bytes in one request,
 * the standard approach for files this size (a month of one employee's
 * compressed selfies, comfortably under a few MB). */
export async function uploadFile(parentId: string, filename: string, buffer: Buffer): Promise<string> {
  const boundary = "craftshr-archive-boundary";
  const metadata = JSON.stringify({ name: filename, parents: [parentId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await driveFetch("files?uploadType=multipart&fields=id,size", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Read back the uploaded file's size to confirm it actually landed intact
 * before the caller deletes anything local. */
export async function getFileSize(fileId: string): Promise<number> {
  const res = await driveFetch(`files/${fileId}?fields=size`);
  const json = (await res.json()) as { size?: string };
  return Number(json.size ?? 0);
}
