import { describe, it, expect } from "vitest";
import { submitPunchSchema } from "./attendance";

const base = {
  eventType: "in" as const,
  clientCapturedAt: new Date().toISOString(),
  latitude: 19.076,
  longitude: 72.8777,
  gpsAccuracyMeters: 12,
  deviceInfo: { userAgent: "test" },
  clientRequestId: crypto.randomUUID(),
  photoTempPath: "temp/employee-1/abc.jpg",
};

describe("submitPunchSchema", () => {
  it("accepts a well-formed punch", () => {
    expect(submitPunchSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a missing photo path", () => {
    const result = submitPunchSchema.safeParse({ ...base, photoTempPath: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(submitPunchSchema.safeParse({ ...base, latitude: 200 }).success).toBe(false);
  });

  it("rejects an invalid event type", () => {
    expect(submitPunchSchema.safeParse({ ...base, eventType: "lunch" }).success).toBe(false);
  });
});
