import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireCronSecret } from "./auth";

describe("requireCronSecret", () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  function request(authHeader?: string) {
    return new NextRequest("https://example.com/api/cron/finalize-attendance", {
      headers: authHeader ? { authorization: authHeader } : {},
    });
  }

  it("rejects a request with no Authorization header", () => {
    const result = requireCronSecret(request());
    expect(result?.status).toBe(401);
  });

  it("rejects a request with the wrong secret", () => {
    const result = requireCronSecret(request("Bearer wrong-secret"));
    expect(result?.status).toBe(401);
  });

  it("lets a request with the correct secret reach the handler", () => {
    const result = requireCronSecret(request("Bearer test-secret"));
    expect(result).toBeNull();
  });
});
