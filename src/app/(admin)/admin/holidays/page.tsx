import { listHolidays } from "@/lib/data/leave";
import { listOffices } from "@/lib/data/admin";
import { HolidayManager } from "@/components/admin/holiday-manager";

export default async function AdminHolidaysPage() {
  const [holidays, offices] = await Promise.all([listHolidays(), listOffices()]);
  return <HolidayManager holidays={holidays} offices={offices} />;
}
