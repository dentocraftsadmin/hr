import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/register"];

// Set by this middleware only, on every request that reaches a Server
// Component render — never by a client. AdminLayout reads these instead of
// re-verifying the session with Supabase a second time. Always written
// (even to "" when there's no user), which overwrites any value a client
// tried to send under these names before this request is forwarded, so
// nothing downstream can be spoofed through them.
const USER_ID_HEADER = "x-craftshr-user-id";
const USER_ROLE_HEADER = "x-craftshr-user-role";

export async function middleware(request: NextRequest) {
  // Cookie refresh (a token renewal during getUser()) is collected here and
  // replayed onto whichever response we end up returning, instead of being
  // baked into a response object we might later discard.
  let pendingCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          pendingCookies = cookiesToSet;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // This is a UX convenience, not the security boundary — RLS is what
  // actually protects the data even if this check is bypassed.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let role: string | null = null;
  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(USER_ID_HEADER, user?.id ?? "");
  requestHeaders.set(USER_ROLE_HEADER, role ?? "");

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: [
    // api/cron/* is excluded here, not because it's public, but because it
    // authenticates via CRON_SECRET (see lib/cron/auth.ts), not a Supabase
    // session cookie — Vercel Cron and Supabase's pg_cron sweep never carry
    // one, so leaving these matched would redirect every cron invocation to
    // /login before requireCronSecret() ever runs.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/cron|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
