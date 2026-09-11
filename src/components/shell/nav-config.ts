import {
  LayoutDashboard,
  Users,
  Network,
  IdCard,
  ShieldCheck,
  CalendarDays,
  PartyPopper,
  Clock,
  MapPin,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/departments", label: "Departments", icon: Network },
      { href: "/admin/designations", label: "Designations", icon: IdCard },
    ],
  },
  {
    label: "Workforce",
    items: [
      { href: "/admin/points", label: "Compliance", icon: ShieldCheck },
      { href: "/admin/leave", label: "Leave", icon: CalendarDays },
      { href: "/admin/holidays", label: "Holidays", icon: PartyPopper },
      { href: "/admin/shifts", label: "Shifts", icon: Clock },
    ],
  },
  {
    label: "Organization",
    items: [{ href: "/admin/offices", label: "Offices", icon: MapPin }],
  },
  {
    label: "Insights",
    items: [{ href: "/admin/reports", label: "Reports", icon: BarChart3 }],
  },
];

export const FLAT_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
