import { cookies } from "next/headers";

const COOKIE_NAME = "wa_challenge";

export type ChallengePurpose = "registration" | "authentication";

type ChallengeData = { challenge: string; employeeId: string; purpose: ChallengePurpose };

/** Short-lived, httpOnly — this only needs to survive one round trip
 * (options generated -> browser prompts -> response verified), and its
 * secrecy isn't the security property here anyway: the WebAuthn signature
 * itself proves possession of the private key. This just ties a specific
 * challenge to a specific employee so one flow can't be replayed against a
 * different account. */
export async function setChallenge(challenge: string, meta: { employeeId: string; purpose: ChallengePurpose }): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify({ challenge, ...meta }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
}

export async function getAndClearChallenge(): Promise<ChallengeData | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  store.delete(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChallengeData;
    if (!parsed.challenge || !parsed.employeeId || !parsed.purpose) return null;
    return parsed;
  } catch {
    return null;
  }
}
