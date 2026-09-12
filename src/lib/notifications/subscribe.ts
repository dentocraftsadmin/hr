function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type SubscribeResult =
  | { ok: true; subscription: PushSubscriptionJSON }
  | { ok: false; reason: "unsupported" | "denied" | "error"; message: string };

/** Never throws — every failure mode a caller needs to render distinctly
 * (unsupported browser vs. permission denied vs. anything else) comes back
 * as a typed result instead of an error message to string-match against. */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported", message: "This browser or device doesn't support push notifications." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, reason: "error", message: "Push notifications aren't configured on this server." };
  }

  // Checking permission first (rather than jumping straight to
  // requestPermission) means a browser that already denied it in a past
  // visit gets the same clear "denied" message without ever hanging on a
  // one-shot prompt the browser refuses to show again.
  if (Notification.permission === "denied") {
    return {
      ok: false,
      reason: "denied",
      message: "Notifications are blocked for this site. Enable them in your browser/device settings, then try again.",
    };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: "error", message: "Couldn't request notification permission." };
  }
  if (permission !== "granted") {
    return {
      ok: false,
      reason: "denied",
      message: "Notifications are blocked for this site. Enable them in your browser/device settings, then try again.",
    };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    return { ok: true, subscription: subscription.toJSON() };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Could not set up push notifications.",
    };
  }
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
