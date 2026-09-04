import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data/current-user";
import { logout } from "@/server/actions/auth";

const NAV = [
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/points", label: "Compliance" },
  { href: "/admin/leave", label: "Leave" },
  { href: "/admin/holidays", label: "Holidays" },
  { href: "/admin/offices", label: "Offices" },
  { href: "/admin/shifts", label: "Shifts" },
  { href: "/admin/departments", label: "Departments" },
  { href: "/admin/designations", label: "Designations" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");

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
