import { listOffices, listShifts } from "@/lib/data/admin";
import { OfficeManager, AddOfficeButton } from "@/components/admin/office-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function OfficesPage() {
  const [offices, shifts] = await Promise.all([listOffices(), listShifts()]);
  return (
    <div>
      <PageHeader
        title="Offices"
        description="Work locations and their geofenced check-in radius for attendance verification."
        actions={<AddOfficeButton shifts={shifts} />}
      />
      <OfficeManager offices={offices} />
    </div>
  );
}
