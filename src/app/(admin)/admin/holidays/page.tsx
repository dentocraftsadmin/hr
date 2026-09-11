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
        description="Company-wide and office-specific holidays — approved leave and holidays never count against attendance."
      />
      <HolidayManager holidays={holidays} offices={offices} />
    </div>
  );
}
