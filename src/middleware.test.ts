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

const { getUser, getProfile } = vi.hoisted(() => ({ getUser: vi.fn(), getProfile: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ single: getProfile }) }) }),
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

describe("verified-identity header forwarding", () => {
  it("forwards the verified admin's id and role to the downstream request", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "admin-1" } } });
    getProfile.mockResolvedValueOnce({ data: { role: "admin" } });

    const response = await middleware(new NextRequest("https://example.com/admin"));

    expect(response.headers.get("x-middleware-request-x-craftshr-user-id")).toBe("admin-1");
    expect(response.headers.get("x-middleware-request-x-craftshr-user-role")).toBe("admin");
  });

  it("cannot have its role header spoofed by a client-supplied value on a non-admin path", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "emp-1" } } });

    // A client tries to smuggle in its own value for the header AdminLayout
    // trusts. Middleware never queries a role for a non-/admin path, so this
    // must come out empty, not the client's injected "admin".
    const response = await middleware(
      new NextRequest("https://example.com/dashboard", {
        headers: { "x-craftshr-user-role": "admin" },
      })
    );

    expect(response.headers.get("x-middleware-request-x-craftshr-user-role")).toBe("");
  });

  it("cannot have its role header spoofed by a client-supplied value on an admin path either", async () => {
    getUser.mockResolvedValueOnce({ data: { user: { id: "emp-1" } } });
    getProfile.mockResolvedValueOnce({ data: { role: "employee" } });

    const response = await middleware(
      new NextRequest("https://example.com/admin/employees", {
        headers: { "x-craftshr-user-role": "admin" },
      })
    );

    // Not "admin" as the client tried to send — the real (redirecting)
    // response short-circuits before any header is forwarded at all.
    expect(response.status).toBe(307);
    expect(response.headers.get("x-middleware-request-x-craftshr-user-role")).toBeNull();
  });
});
