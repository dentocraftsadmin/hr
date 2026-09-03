import { z } from "zod";

export const submitPunchSchema = z.object({
  eventType: z.enum(["in", "out"]),
  clientCapturedAt: z.iso.datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyMeters: z.number().nullable(),
  deviceInfo: z.record(z.string(), z.unknown()),
  clientRequestId: z.uuid(),
  photoTempPath: z.string().min(1).nullable(),
});

export type SubmitPunchInput = z.infer<typeof submitPunchSchema>;
