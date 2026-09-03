"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitPunch, type PunchResult } from "@/server/actions/attendance";

type Step =
  | "idle"
  | "starting"
  | "camera-ready"
  | "captured"
  | "submitting"
  | "done"
  | "error";

type Position = { latitude: number; longitude: number; accuracy: number };

/** Employees must complete a live selfie + GPS fix to punch — there is no
 * skip path. Denied/unavailable camera or location surfaces a clear error
 * and a retry, never a way to submit without both. */
export function PunchFlow({
  employeeId,
  punchType,
  disabled,
  disabledReason,
}: {
  employeeId: string;
  punchType: "in" | "out";
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<PunchResult, { ok: true }>["data"] | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clientRequestIdRef = useRef<string>(crypto.randomUUID());

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function start() {
    setError(null);
    setStep("starting");
    clientRequestIdRef.current = crypto.randomUUID();

    const geoPromise = new Promise<Position>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        () => reject(new Error("Location permission is required to punch. Enable it and try again.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
    } catch {
      setError("Camera access is required to punch. Enable camera permission and try again.");
      setStep("error");
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
    setStep("camera-ready");

    try {
      setPosition(await geoPromise);
    } catch (e) {
      stopCamera();
      setError(e instanceof Error ? e.message : "Could not get your location.");
      setStep("error");
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = Math.round((480 * video.videoHeight) / video.videoWidth) || 480;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not capture the photo. Try again.");
          setStep("error");
          return;
        }
        setPhotoBlob(blob);
        setPhotoUrl(URL.createObjectURL(blob));
        stopCamera();
        setStep("captured");
      },
      "image/jpeg",
      0.6
    );
  }

  function retake() {
    setPhotoBlob(null);
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    start();
  }

  async function confirm() {
    if (!photoBlob || !position) return;
    setStep("submitting");
    setError(null);

    try {
      const supabase = createClient();
      const path = `temp/${employeeId}/${clientRequestIdRef.current}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("punch-photos-temp")
        .upload(path, photoBlob, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        setError("Could not upload the photo. Check your connection and try again.");
        setStep("error");
        return;
      }

      const outcome = await submitPunch({
        eventType: punchType,
        clientCapturedAt: new Date().toISOString(),
        latitude: position.latitude,
        longitude: position.longitude,
        gpsAccuracyMeters: position.accuracy,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screen: `${window.screen.width}x${window.screen.height}`,
        },
        clientRequestId: clientRequestIdRef.current,
        photoTempPath: path,
      });

      if (!outcome.ok) {
        // Same clientRequestId on retry — the database's idempotency
        // constraint means this can never create a duplicate punch even if
        // the previous attempt actually succeeded server-side and only the
        // response was lost.
        setError(outcome.error);
        setStep("error");
        return;
      }

      setResult(outcome.data);
      setStep("done");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setStep("error");
    }
  }

  if (disabled) {
    return <p className="text-sm text-muted rounded-lg bg-background border border-border px-4 py-3">{disabledReason}</p>;
  }

  if (step === "done" && result) {
    return (
      <div className="rounded-lg border border-border bg-primary-soft px-4 py-3 text-sm text-primary-strong">
        <p className="font-medium">
          Punched {punchType} — {result.locationStatus === "at_office" ? "At office" : "Away from office"}
          {result.officeName ? ` (${result.officeName})` : ""}
        </p>
        {punchType === "in" && result.isLate && <p className="mt-1">Marked late.</p>}
        {punchType === "out" && result.hoursWorked != null && (
          <p className="mt-1">
            {result.hoursWorked.toFixed(2)} hours worked · {result.dayType.replace("_", " ")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {step === "idle" && (
        <button
          onClick={start}
          className="w-full rounded-lg bg-primary text-white font-medium py-3"
        >
          Punch {punchType === "in" ? "In" : "Out"}
        </button>
      )}

      {step === "starting" && <p className="text-sm text-muted">Requesting camera and location…</p>}

      {(step === "camera-ready" || step === "starting") && (
        <div className={step === "camera-ready" ? "space-y-3" : "hidden"}>
          <video ref={videoRef} className="w-full rounded-lg bg-black aspect-[3/4] object-cover" muted playsInline />
          <p className="text-xs text-muted">{position ? "Location captured." : "Getting your location…"}</p>
          <button
            onClick={capture}
            disabled={!position}
            className="w-full rounded-lg bg-primary text-white font-medium py-3 disabled:opacity-50"
          >
            Capture selfie
          </button>
        </div>
      )}

      {step === "captured" && photoUrl && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Captured selfie" className="w-full rounded-lg aspect-[3/4] object-cover" />
          <div className="flex gap-2">
            <button onClick={retake} className="flex-1 rounded-lg border border-border text-foreground font-medium py-2.5">
              Retake
            </button>
            <button onClick={confirm} className="flex-1 rounded-lg bg-primary text-white font-medium py-2.5">
              Confirm punch {punchType}
            </button>
          </div>
        </div>
      )}

      {step === "submitting" && <p className="text-sm text-muted">Recording your punch…</p>}

      {step === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
          <button onClick={start} className="w-full rounded-lg bg-primary text-white font-medium py-2.5">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
