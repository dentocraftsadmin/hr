import { listShifts } from "@/lib/data/admin";
import { ShiftManager } from "@/components/admin/shift-form";

export default async function ShiftsPage() {
  const shifts = await listShifts();
  return <ShiftManager shifts={shifts} />;
}
