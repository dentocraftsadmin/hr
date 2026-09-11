import Link from "next/link";
import { HelpCircle } from "lucide-react";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="sticky top-0 z-10 bg-surface border-b border-border">
        <div className="max-w-md mx-auto flex items-center">
          <Link
            href="/dashboard"
            className="flex-1 text-center py-3 text-sm font-medium text-muted hover:text-foreground border-b-2 border-transparent hover:border-primary"
          >
            Attendance
          </Link>
          <Link
            href="/dashboard/leave"
            className="flex-1 text-center py-3 text-sm font-medium text-muted hover:text-foreground border-b-2 border-transparent hover:border-primary"
          >
            Leave
          </Link>
          <Link
            href="/rules"
            aria-label="Rules and policies"
            className="px-3 py-3 text-muted hover:text-primary-strong"
          >
            <HelpCircle className="h-4 w-4" />
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
