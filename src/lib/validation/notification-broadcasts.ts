import { z } from "zod";

export const audienceTypeSchema = z.enum(["everyone", "department", "office", "department_office", "individual"]);

export const broadcastFormSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required").max(500),
    audience_type: audienceTypeSchema,
    department_id: z.uuid().optional().or(z.literal("")),
    office_id: z.uuid().optional().or(z.literal("")),
    employee_id: z.uuid().optional().or(z.literal("")),
    send_now: z.enum(["true", "false"]),
    scheduled_local: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if ((data.audience_type === "department" || data.audience_type === "department_office") && !data.department_id) {
      ctx.addIssue({ code: "custom", message: "Select a department", path: ["department_id"] });
    }
    if ((data.audience_type === "office" || data.audience_type === "department_office") && !data.office_id) {
      ctx.addIssue({ code: "custom", message: "Select an office", path: ["office_id"] });
    }
    if (data.audience_type === "individual" && !data.employee_id) {
      ctx.addIssue({ code: "custom", message: "Select an employee", path: ["employee_id"] });
    }
    if (data.send_now === "false" && !data.scheduled_local) {
      ctx.addIssue({ code: "custom", message: "Pick a date and time to schedule", path: ["scheduled_local"] });
    }
  });
