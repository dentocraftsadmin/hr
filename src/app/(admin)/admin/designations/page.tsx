import { IdCard } from "lucide-react";
import { listDesignations } from "@/lib/data/admin";
import { createDesignation, toggleDesignation } from "@/server/actions/lookups";
import { LookupManager } from "@/components/admin/lookup-manager";
import { PageHeader } from "@/components/ui/page-header";

export default async function DesignationsPage() {
  const designations = await listDesignations();
  return (
    <div>
      <PageHeader
        title="Designations"
        description="Job titles and roles employees can be assigned to."
      />
      <LookupManager
        label="Designations"
        singular="Designation"
        icon={<IdCard />}
        emptyDescription="Add job titles so employee records reflect their actual role."
        items={designations}
        createAction={createDesignation}
        toggleAction={toggleDesignation}
      />
    </div>
  );
}
