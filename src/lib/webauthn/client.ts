import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import {
  getQuickUnlockRegistrationOptions,
  verifyQuickUnlockRegistration,
  getQuickUnlockAuthenticationOptions,
  verifyQuickUnlockAuthentication,
} from "@/server/actions/webauthn";

const DB_NAME = "craftshr-quick-unlock";
const STORE_NAME = "sessions";

/**
 * Quick unlock does not mint a new server session from a biometric check —
 * Supabase Auth has no such thing. Instead: the device's own refresh token
 * (already issued by a normal PIN sign-in) is cached here, and a real,
 * server-verified WebAuthn credential gates handing it back to
 * supabase.auth.setSession() later. This is the same trust level as
 * Supabase's own default session storage — not "encrypted by" the
 * fingerprint, since no browser API makes that possible — the value add is
 * that nothing here is usable without the registered authenticator saying
 * yes first.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "phone" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSession(phone: string, refreshToken: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ phone, refreshToken, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadSession(phone: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(phone);
    req.onsuccess = () => resolve((req.result as { refreshToken: string } | undefined)?.refreshToken ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearQuickUnlockSession(phone: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(phone);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** For the login page: is there a device-cached quick-unlock session for
 * this phone number, so it's worth offering the button at all? */
export async function hasQuickUnlockSession(phone: string): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    return (await loadSession(phone)) !== null;
  } catch {
    return false;
  }
}

export type QuickUnlockSetupResult = { ok: true } | { ok: false; reason: "unsupported" | "error"; message: string };

export async function setUpQuickUnlock(phone: string, refreshToken: string): Promise<QuickUnlockSetupResult> {
  if (!browserSupportsWebAuthn()) {
    return { ok: false, reason: "unsupported", message: "This device or browser doesn't support quick unlock." };
  }

  const optionsResult = await getQuickUnlockRegistrationOptions();
  if (!optionsResult.ok) return { ok: false, reason: "error", message: optionsResult.error };

  let attestation;
  try {
    attestation = await startRegistration({ optionsJSON: optionsResult.options });
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "Setup was cancelled." };
  }

  const verifyResult = await verifyQuickUnlockRegistration(attestation);
  if (!verifyResult.ok) return { ok: false, reason: "error", message: verifyResult.error };

  await saveSession(phone, refreshToken);
  return { ok: true };
}

export type QuickUnlockLoginResult =
  | { ok: true; refreshToken: string }
  | { ok: false; reason: "unsupported" | "not_configured" | "cancelled" | "error"; message: string };

export async function tryQuickUnlockLogin(phone: string): Promise<QuickUnlockLoginResult> {
  if (!browserSupportsWebAuthn()) {
    return { ok: false, reason: "unsupported", message: "This device or browser doesn't support quick unlock." };
  }

  const refreshToken = await loadSession(phone);
  if (!refreshToken) {
    return { ok: false, reason: "not_configured", message: "Quick unlock isn't set up on this device." };
  }

  const optionsResult = await getQuickUnlockAuthenticationOptions(phone);
  if (!optionsResult.ok) return { ok: false, reason: "not_configured", message: optionsResult.error };

  let assertion;
  try {
    assertion = await startAuthentication({ optionsJSON: optionsResult.options });
  } catch (e) {
    return { ok: false, reason: "cancelled", message: e instanceof Error ? e.message : "Quick unlock was cancelled." };
  }

  const verifyResult = await verifyQuickUnlockAuthentication(assertion);
  if (!verifyResult.ok) {
    // A stale/revoked credential shouldn't leave a dead entry offering a
    // button that will never work again.
    await clearQuickUnlockSession(phone).catch(() => {});
    return { ok: false, reason: "error", message: verifyResult.error };
  }

  return { ok: true, refreshToken };
}
