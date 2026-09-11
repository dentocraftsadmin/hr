import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/server/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/points", label: "Compliance" },
  { href: "/admin/leave", label: "Leave" },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/offices", label: "Offices" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/designations", label: "Designations" },
];

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-foreground">CraftsHR · HR Console</span>
          <form action={logout}>
            <button type="submit" className="text-sm text-muted underline">
              Sign out
            </button>
          </form>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-2 text-sm font-medium text-muted hover:text-foreground border-b-2 border-transparent hover:border-primary whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
