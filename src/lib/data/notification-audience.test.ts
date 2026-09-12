import { describe, it, expect } from "vitest";
import { describeAudience } from "./notification-audience";

const lookups = {
  departments: [{ id: "d1", name: "Production" }],
  offices: [{ id: "o1", name: "Main Lab" }],
  employees: [{ id: "e1", full_name: "Jane Doe" }],
};

describe("describeAudience", () => {
  it("describes everyone", () => {
    expect(describeAudience({ type: "everyone" }, lookups)).toBe("Everyone");
  });

  it("describes a department", () => {
    expect(describeAudience({ type: "department", departmentId: "d1" }, lookups)).toBe("Department: Production");
  });

  it("describes an office", () => {
    expect(describeAudience({ type: "office", officeId: "o1" }, lookups)).toBe("Office: Main Lab");
  });

  it("describes department + office", () => {
    expect(describeAudience({ type: "department_office", departmentId: "d1", officeId: "o1" }, lookups)).toBe(
      "Production · Main Lab"
    );
  });

  it("describes an individual", () => {
    expect(describeAudience({ type: "individual", employeeId: "e1" }, lookups)).toBe("Jane Doe");
  });

  it("falls back gracefully for an id that no longer resolves", () => {
    expect(describeAudience({ type: "department", departmentId: "gone" }, lookups)).toBe("Department: Unknown department");
  });
});
