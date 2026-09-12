"use server";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRpConfig } from "@/lib/webauthn/config";
import { setChallenge, getAndClearChallenge } from "@/lib/webauthn/challenge";

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

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function hasQuickUnlockCredential(): Promise<boolean> {
  const ctx = await requireEmployee();
  if (!ctx) return false;
  const { count } = await ctx.supabase
    .from("webauthn_credentials")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", ctx.employeeId);
  return (count ?? 0) > 0;
}

export async function getQuickUnlockRegistrationOptions(): Promise<Result<{ options: PublicKeyCredentialCreationOptions_ }>> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const { data: employee } = await ctx.supabase.from("employees").select("full_name").eq("id", ctx.employeeId).single();
  const { data: existing } = await ctx.supabase
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("employee_id", ctx.employeeId);

  const { rpID, rpName } = await getRpConfig();
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: employee?.full_name ?? "Employee",
    userID: new TextEncoder().encode(ctx.employeeId),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred", authenticatorAttachment: "platform" },
  });

  await setChallenge(options.challenge, { employeeId: ctx.employeeId, purpose: "registration" });
  return { ok: true, options };
}

export async function verifyQuickUnlockRegistration(response: RegistrationResponseJSON): Promise<Result> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const challengeData = await getAndClearChallenge();
  if (!challengeData || challengeData.purpose !== "registration" || challengeData.employeeId !== ctx.employeeId) {
    return { ok: false, error: "This setup attempt expired. Try again." };
  }

  const { rpID, origin } = await getRpConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { ok: false, error: "Could not verify this device." };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Could not verify this device." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const { error } = await ctx.supabase.from("webauthn_credentials").insert({
    employee_id: ctx.employeeId,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? null,
  });
  if (error) return { ok: false, error: "Could not save this device." };

  return { ok: true };
}

export async function getQuickUnlockAuthenticationOptions(
  phone: string
): Promise<Result<{ options: PublicKeyCredentialRequestOptions_ }>> {
  const admin = createAdminClient();
  const { data: employee } = await admin.from("employees").select("id").eq("phone", phone).maybeSingle();
  if (!employee) return { ok: false, error: "Quick unlock isn't set up for this account." };

  const { data: creds } = await admin
    .from("webauthn_credentials")
    .select("credential_id, transports")
    .eq("employee_id", employee.id);
  if (!creds || creds.length === 0) return { ok: false, error: "Quick unlock isn't set up for this account." };

  const { rpID } = await getRpConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransport[] | undefined,
    })),
    userVerification: "preferred",
  });

  await setChallenge(options.challenge, { employeeId: employee.id, purpose: "authentication" });
  return { ok: true, options };
}

export async function verifyQuickUnlockAuthentication(response: AuthenticationResponseJSON): Promise<Result<{ employeeId: string }>> {
  const challengeData = await getAndClearChallenge();
  if (!challengeData || challengeData.purpose !== "authentication") {
    return { ok: false, error: "This attempt expired. Try again." };
  }

  const admin = createAdminClient();
  const { data: stored } = await admin
    .from("webauthn_credentials")
    .select("*")
    .eq("employee_id", challengeData.employeeId)
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!stored) return { ok: false, error: "Unrecognized device." };

  const { rpID, origin } = await getRpConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: isoBase64URL.toBuffer(stored.public_key),
        counter: stored.counter,
        transports: (stored.transports ?? undefined) as AuthenticatorTransport[] | undefined,
      },
    });
  } catch {
    return { ok: false, error: "Could not verify this device." };
  }
  if (!verification.verified) return { ok: false, error: "Could not verify this device." };

  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", stored.id);

  return { ok: true, employeeId: challengeData.employeeId };
}

/** "Remove quick unlock" is a single account-level toggle from the
 * employee's point of view, not per-credential management — clears every
 * registered authenticator for this employee. */
export async function removeAllQuickUnlockCredentials(): Promise<Result> {
  const ctx = await requireEmployee();
  if (!ctx) return { ok: false, error: "Not signed in." };
  await ctx.supabase.from("webauthn_credentials").delete().eq("employee_id", ctx.employeeId);
  return { ok: true };
}

// @simplewebauthn/server's *OptionsJSON types round-trip through JSON fine
// as a Server Action return value; these aliases just document that at the
// call sites above without importing the (identical in practice) browser
// lib types into server code.
type PublicKeyCredentialCreationOptions_ = Awaited<ReturnType<typeof generateRegistrationOptions>>;
type PublicKeyCredentialRequestOptions_ = Awaited<ReturnType<typeof generateAuthenticationOptions>>;
