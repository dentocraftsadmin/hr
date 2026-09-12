import { describeAudience, type AudienceInput } from "@/lib/data/notification-audience";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { History } from "lucide-react";

type Option = { id: string; name: string };

type BroadcastRow = {
  id: string;
  message: string;
  audience_type: string;
  department_id: string | null;
  office_id: string | null;
  employee_id: string | null;
  recipient_count: number;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  created_at: string;
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  sent: "success",
  sending: "warning",
  scheduled: "neutral",
  failed: "danger",
  cancelled: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "Sent",
  sending: "Sending",
  scheduled: "Scheduled",
  failed: "Failed",
  cancelled: "Cancelled",
};

function audienceInputFor(row: BroadcastRow): AudienceInput {
  switch (row.audience_type) {
    case "department":
      return { type: "department", departmentId: row.department_id ?? "" };
    case "office":
      return { type: "office", officeId: row.office_id ?? "" };
    case "department_office":
      return { type: "department_office", departmentId: row.department_id ?? "", officeId: row.office_id ?? "" };
    case "individual":
      return { type: "individual", employeeId: row.employee_id ?? "" };
    default:
      return { type: "everyone" };
  }
}

export function NotificationHistory({
  broadcasts,
  departments,
  offices,
  employees,
}: {
  broadcasts: BroadcastRow[];
  departments: Option[];
  offices: Option[];
  employees: Option[];
}) {
  if (broadcasts.length === 0) {
    return (
      <Card>
        <EmptyState icon={History} title="No notifications sent yet" description="Everything you send or schedule will show up here." />
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {broadcasts.map((b) => (
        <div key={b.id} className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground">{b.message}</p>
            <Badge tone={STATUS_TONE[b.status] ?? "neutral"} className="shrink-0">
              {STATUS_LABEL[b.status] ?? b.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            {describeAudience(audienceInputFor(b), { departments, offices, employees: employees.map((e) => ({ id: e.id, full_name: e.name })) })}
            {" · "}
            {b.recipient_count} {b.recipient_count === 1 ? "recipient" : "recipients"}
            {" · "}
            {b.sent_at ? `sent ${new Date(b.sent_at).toLocaleString()}` : `scheduled for ${new Date(b.scheduled_at).toLocaleString()}`}
          </p>
        </div>
      ))}
    </Card>
  );
}
