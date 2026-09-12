"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bell, Clock } from "lucide-react";
import { previewAudienceCount, sendBroadcast, sendTestNotification } from "@/server/actions/notification-broadcasts";
import { describeAudience, type AudienceInput } from "@/lib/data/notification-audience";
import { Card } from "@/components/ui/card";
import { Field, FormSection, Select, Textarea, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { EmployeeNotificationStatus } from "@/lib/data/notification-status";

type Option = { id: string; name: string };
type Employee = { id: string; name: string; department_id: string | null; status: EmployeeNotificationStatus };

type AudienceType = "everyone" | "department" | "office" | "department_office" | "individual";

export function NotificationComposer({
  departments,
  offices,
  employees,
  timezone,
}: {
  departments: Option[];
  offices: Option[];
  employees: Employee[];
  timezone: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"compose" | "preview" | "sent">("compose");
  const [message, setMessage] = useState("");
  const [audienceType, setAudienceType] = useState<AudienceType>("everyone");
  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [sendNow, setSendNow] = useState(true);
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const audience: AudienceInput = useMemo(() => {
    switch (audienceType) {
      case "everyone":
        return { type: "everyone" };
      case "department":
        return { type: "department", departmentId };
      case "office":
        return { type: "office", officeId };
      case "department_office":
        return { type: "department_office", departmentId, officeId };
      case "individual":
        return { type: "individual", employeeId };
    }
  }, [audienceType, departmentId, officeId, employeeId]);

  const audienceLabel = useMemo(
    () =>
      describeAudience(audience, {
        departments,
        offices,
        employees: employees.map((e) => ({ id: e.id, full_name: e.name })),
      }),
    [audience, departments, offices, employees]
  );

  function validateCompose(): string | null {
    if (!message.trim()) return "Write a message first.";
    if (audienceType === "department" && !departmentId) return "Select a department.";
    if (audienceType === "office" && !officeId) return "Select an office.";
    if (audienceType === "department_office" && (!departmentId || !officeId)) return "Select both a department and an office.";
    if (audienceType === "individual" && !employeeId) return "Select an employee.";
    if (!sendNow && !scheduledLocal) return "Pick a date and time to schedule.";
    if (!sendNow && new Date(scheduledLocal) < new Date()) return "Pick a time in the future.";
    return null;
  }

  function onReview() {
    setError(null);
    const validationError = validateCompose();
    if (validationError) {
      setError(validationError);
      return;
    }
    startTransition(async () => {
      const result = await previewAudienceCount(audience);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.count === 0) {
        setError("No active employees match this audience.");
        return;
      }
      setCount(result.count);
      setPhase("preview");
    });
  }

  function onConfirmSend() {
    setError(null);
    const formData = new FormData();
    formData.set("message", message);
    formData.set("audience_type", audienceType);
    formData.set("department_id", departmentId);
    formData.set("office_id", officeId);
    formData.set("employee_id", employeeId);
    formData.set("send_now", String(sendNow));
    formData.set("scheduled_local", scheduledLocal);

    startTransition(async () => {
      const result = await sendBroadcast(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhase("sent");
      setMessage("");
      setDepartmentId("");
      setOfficeId("");
      setEmployeeId("");
      setScheduledLocal("");
      setSendNow(true);
      router.refresh();
    });
  }

  function onTestToSelf() {
    setTestResult(null);
    startTransition(async () => {
      const result = await sendTestNotification({ toSelf: true });
      setTestResult(result.ok ? "Test notification sent to you." : result.error);
    });
  }

  function onTestToEmployee() {
    if (!employeeId) return;
    setTestResult(null);
    startTransition(async () => {
      const result = await sendTestNotification({ employeeId });
      setTestResult(result.ok ? "Test notification sent to that employee." : result.error);
    });
  }

  if (phase === "sent") {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="rounded-lg bg-success-soft p-2">
            <Send className="h-4 w-4 text-success" />
          </div>
          <h2 className="font-medium text-foreground">Notification sent</h2>
        </div>
        <p className="text-sm text-muted mb-4">It now shows up in the history below.</p>
        <Button variant="secondary" size="sm" onClick={() => setPhase("compose")}>
          Compose another
        </Button>
      </Card>
    );
  }

  if (phase === "preview") {
    return (
      <Card className="p-5">
        <h2 className="font-medium text-foreground mb-3">Review before sending</h2>
        <dl className="space-y-2.5 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-soft">Message</dt>
            <dd className="mt-0.5 text-foreground bg-surface-sunken rounded-lg px-3 py-2">{message}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-soft">Audience</dt>
            <dd className="mt-0.5 text-foreground">{audienceLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-soft">Recipients</dt>
            <dd className="mt-0.5 text-foreground">
              {count} {count === 1 ? "employee" : "employees"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-soft">When</dt>
            <dd className="mt-0.5 text-foreground">
              {sendNow ? "Send now" : `${scheduledLocal.replace("T", " ")} (${timezone})`}
            </dd>
          </div>
        </dl>

        {error && <p role="alert" className="mt-3 text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="mt-4 flex gap-2">
          <Button onClick={onConfirmSend} disabled={isPending}>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {sendNow ? "Send now" : "Confirm schedule"}
          </Button>
          <Button variant="secondary" onClick={() => setPhase("compose")} disabled={isPending}>
            Edit
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary-soft p-2">
            <Bell className="h-4 w-4 text-primary-strong" />
          </div>
          <h2 className="font-medium text-foreground">Compose notification</h2>
        </div>
        <button
          type="button"
          onClick={onTestToSelf}
          disabled={isPending}
          className="text-xs font-medium text-muted hover:text-foreground disabled:opacity-50"
        >
          Send test to myself
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Message" htmlFor="composer-message" required description="Up to 500 characters">
          <Textarea
            id="composer-message"
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tomorrow's office timing is 9:30 AM."
          />
        </Field>

        <FormSection title="Audience">
          <Field label="Send to" htmlFor="audience_type" required>
            <Select id="audience_type" value={audienceType} onChange={(e) => setAudienceType(e.target.value as AudienceType)}>
              <option value="everyone">Everyone</option>
              <option value="department">Department</option>
              <option value="office">Office</option>
              <option value="department_office">Department + Office</option>
              <option value="individual">Individual employee</option>
            </Select>
          </Field>

          {(audienceType === "department" || audienceType === "department_office") && (
            <Field label="Department" htmlFor="composer_department" required>
              <Select id="composer_department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {(audienceType === "office" || audienceType === "department_office") && (
            <Field label="Office" htmlFor="composer_office" required>
              <Select id="composer_office" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">Select office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {audienceType === "individual" && (
            <Field label="Employee" htmlFor="composer_employee" required>
              <Select id="composer_employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.status === "active" ? "notifications on" : "not enabled"}
                  </option>
                ))}
              </Select>
              {employeeId && (
                <button
                  type="button"
                  onClick={onTestToEmployee}
                  disabled={isPending}
                  className="mt-1.5 text-xs font-medium text-primary-strong hover:underline disabled:opacity-50"
                >
                  Send test to this employee
                </button>
              )}
            </Field>
          )}
        </FormSection>

        <FormSection title="When">
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="when" checked={sendNow} onChange={() => setSendNow(true)} />
              Send now
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="when" checked={!sendNow} onChange={() => setSendNow(false)} />
              Schedule for later
            </label>
          </div>
          {!sendNow && (
            <Field
              label="Scheduled time"
              htmlFor="composer_schedule"
              required
              description={`In the company's timezone (${timezone})`}
            >
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-soft" />
                <Input
                  id="composer_schedule"
                  type="datetime-local"
                  className="pl-9"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                />
              </div>
            </Field>
          )}
        </FormSection>

        {testResult && <p className="text-xs text-muted">{testResult}</p>}
        {error && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>}

        <Button onClick={onReview} disabled={isPending} className="w-full">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Review
        </Button>
      </div>
    </Card>
  );
}
