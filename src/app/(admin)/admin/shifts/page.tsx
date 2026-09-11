import { listShifts } from "@/lib/data/admin";
import { ShiftManager, AddShiftButton } from "@/components/admin/shift-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function ShiftsPage() {
  const shifts = await listShifts();
  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Working hours, late buffers, and which days each shift applies to."
        actions={<AddShiftButton />}
      />
      <ShiftManager shifts={shifts} />
    </div>
  );
}
