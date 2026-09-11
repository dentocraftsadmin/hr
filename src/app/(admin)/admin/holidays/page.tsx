import Link from "next/link";
import { Info } from "lucide-react";
import { listHolidays } from "@/lib/data/leave";
import { listOffices } from "@/lib/data/admin";
import { HolidayManager } from "@/components/admin/holiday-manager";
import { PageHeader } from "@/components/ui/page-header";

export default async function AdminHolidaysPage() {
  const [holidays, offices] = await Promise.all([listHolidays(), listOffices()]);
  return (
    <div>
      <PageHeader
        title="Holidays"
        description="Company-wide and office-specific holidays — paid, and separate from employee leave."
        actions={
          <Link href="/rules#holidays" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary-strong">
            <Info className="h-4 w-4" /> How holidays work
          </Link>
        }
      />
      <HolidayManager holidays={holidays} offices={offices} />
    </div>
  );
}
