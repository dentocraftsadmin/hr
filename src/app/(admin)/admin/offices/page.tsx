import { listOffices, listShifts } from "@/lib/data/admin";
import { OfficeManager } from "@/components/admin/office-form";

export default async function OfficesPage() {
  const [offices, shifts] = await Promise.all([listOffices(), listShifts()]);
  return <OfficeManager offices={offices} shifts={shifts} />;
}
