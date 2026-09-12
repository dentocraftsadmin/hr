"use client";

import { useState, useTransition } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/notifications/subscribe";
import { savePushSubscription, removePushSubscription, updateNotificationPreferences } from "@/server/actions/notifications";

type Preferences = {
  push_enabled: boolean;
  remind_punch_in: boolean;
  remind_punch_in_minutes_before: number;
  remind_punch_out: boolean;
  remind_missed_punch: boolean;
  remind_missed_punch_out: boolean;
};

export function NotificationSettings({ preferences }: { preferences: Preferences }) {
  const [enabled, setEnabled] = useState(preferences.push_enabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    setError(null);
    startTransition(async () => {
      try {
        if (!enabled) {
          const subscribed = await subscribeToPush();
          if (!subscribed.ok) {
            setError(subscribed.message);
            return;
          }
          const result = await savePushSubscription(subscribed.subscription);
          if (!result.ok) throw new Error(result.error);
          setEnabled(true);
        } else {
          const endpoint = await unsubscribeFromPush();
          if (endpoint) await removePushSubscription(endpoint);
          setEnabled(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update notification settings.");
      }
    });
  }

  function onSavePreferences(formData: FormData) {
    startTransition(async () => {
      await updateNotificationPreferences(formData);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Reminders</h2>
          <p className="text-xs text-muted">Punch-in, punch-out, and missed-punch alerts. Optional.</p>
        </div>
        <button
          onClick={toggle}
          disabled={isPending}
          className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            enabled ? "bg-primary-soft text-primary-strong" : "border border-border text-muted"
          }`}
        >
          {enabled ? "On" : "Turn on"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {enabled && (
        <form action={onSavePreferences} className="mt-3 space-y-2 text-sm">
          <label className="flex items-center justify-between">
            <span className="text-muted">Remind me to punch in</span>
            <input type="checkbox" name="remind_punch_in" defaultChecked={preferences.remind_punch_in} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-muted">Minutes before shift start</span>
            <input
              type="number"
              name="remind_punch_in_minutes_before"
              defaultValue={preferences.remind_punch_in_minutes_before}
              min={0}
              max={120}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-muted">Remind me to punch out</span>
            <input type="checkbox" name="remind_punch_out" defaultChecked={preferences.remind_punch_out} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-muted">Alert me if I forget to punch in</span>
            <input type="checkbox" name="remind_missed_punch" defaultChecked={preferences.remind_missed_punch} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-muted">Alert me if I forget to punch out</span>
            <input type="checkbox" name="remind_missed_punch_out" defaultChecked={preferences.remind_missed_punch_out} />
          </label>
          <input type="hidden" name="push_enabled" value="on" />
          <button type="submit" className="text-xs font-medium text-primary-strong underline">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
