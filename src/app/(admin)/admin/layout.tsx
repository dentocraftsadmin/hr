import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/server/actions/auth";
import { Brand } from "@/components/shell/brand";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { MobileNav } from "@/components/shell/mobile-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already verified this request is an authenticated admin
  // before it ever reaches this render — that's the real, unbypassable gate
  // (every /admin/* request passes through it first). Reading the role it
  // forwarded is a zero-cost sanity check on that guarantee, not a second
  // independent verification: it never asks Supabase anything itself, so a
  // regression here can't fail open the way a skipped check silently could.
  const role = (await headers()).get("x-craftshr-user-role");
  if (role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-sidebar-border bg-sidebar-bg">
        <div className="px-4 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-bg-elevated"
            >
              <LogOut className="h-4 w-4 text-sidebar-muted" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <Brand size="sm" />
          <MobileNav />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
