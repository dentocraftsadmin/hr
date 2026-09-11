import { describe, it, expect, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";

describe("middleware matcher", () => {
  it("matches ordinary pages", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "https://example.com/" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "https://example.com/login" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({ config, url: "https://example.com/admin" })).toBe(true);
  });

  it("matches non-cron API routes, which stay behind the session redirect", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: "https://example.com/api/exports/employees" })
    ).toBe(true);
  });

  it("excludes cron routes, which authenticate via CRON_SECRET instead", () => {
    expect(
      unstable_doesMiddlewareMatch({ config, url: "https://example.com/api/cron/finalize-attendance" })
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({ config, url: "https://example.com/api/cron/archive-photos" })
    ).toBe(false);
    expect(
      unstable_doesMiddlewareMatch({ config, url: "https://example.com/api/cron/send-reminders" })
    ).toBe(false);
  });

  it("still excludes static assets", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "https://example.com/manifest.json" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "https://example.com/sw.js" })).toBe(false);
  });
});

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser },
  }),
}));

describe("middleware redirect behavior", () => {
  it("redirects an unauthenticated browser request to /login", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await middleware(new NextRequest("https://example.com/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/login");
  });

  it("lets an authenticated request through without redirecting", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "emp-1" } } });

    const response = await middleware(new NextRequest("https://example.com/dashboard"));

    expect(response.headers.get("location")).toBeNull();
  });
});
