import { listDesignations } from "@/lib/data/admin";
import { createDesignation, toggleDesignation } from "@/server/actions/lookups";
import { LookupManager } from "@/components/admin/lookup-manager";

export default async function DesignationsPage() {
  const designations = await listDesignations();
  return (
    <LookupManager
      label="Designations"
      items={designations}
      createAction={createDesignation}
      toggleAction={toggleDesignation}
    />
  );
}
