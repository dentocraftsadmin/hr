import { Cake } from "lucide-react";
import { describeBirthday, type UpcomingBirthday } from "@/lib/data/birthdays";
import { Card } from "@/components/ui/card";

/** A shared team calendar, not a notification feed — no push notification
 * is ever sent from this widget or the data behind it. */
export function UpcomingBirthdays({ birthdays, limit = 5 }: { birthdays: UpcomingBirthday[]; limit?: number }) {
  if (birthdays.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="rounded-lg bg-primary-soft p-2">
          <Cake className="h-4 w-4 text-primary-strong" />
        </div>
        <h2 className="font-medium text-foreground">Upcoming birthdays</h2>
      </div>
      <ul className="space-y-1 text-sm">
        {birthdays.slice(0, limit).map((b) => (
          <li key={b.employeeId} className="flex items-center justify-between gap-3">
            <span className={b.daysUntil === 0 ? "font-medium text-foreground" : "text-foreground"}>
              {b.fullName}
              {b.daysUntil === 0 && <span aria-label="today" className="ml-1">🎉</span>}
            </span>
            <span className="text-muted shrink-0">{describeBirthday(b)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
