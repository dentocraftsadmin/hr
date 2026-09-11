"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav-config";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Main navigation">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors relative",
                      active
                        ? "bg-sidebar-active-bg text-sidebar-active-foreground font-medium shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-bg-elevated",
                    ].join(" ")}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary-strong"
                        aria-hidden="true"
                      />
                    )}
                    <Icon
                      className={active ? "h-4 w-4 text-sidebar-active-foreground" : "h-4 w-4 text-sidebar-muted group-hover:text-sidebar-foreground"}
                      strokeWidth={2}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
