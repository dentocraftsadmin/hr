import { describe, it, expect } from "vitest";
import { punchPhotoFilename, employeeZipFilename } from "./filename";

describe("punchPhotoFilename", () => {
  it("formats as DD-MM-YYYY-HH-MM-SS.jpg in the given timezone", () => {
    const date = new Date("2026-09-02T03:37:14Z"); // 09:07:14 in Asia/Kolkata
    const used = new Set<string>();
    expect(punchPhotoFilename(date, "Asia/Kolkata", used)).toBe("02-09-2026-09-07-14.jpg");
  });

  it("appends a minimal numeric suffix on a same-second collision", () => {
    const date = new Date("2026-09-02T03:37:14Z");
    const used = new Set<string>();
    const first = punchPhotoFilename(date, "Asia/Kolkata", used);
    const second = punchPhotoFilename(date, "Asia/Kolkata", used);
    expect(first).toBe("02-09-2026-09-07-14.jpg");
    expect(second).toBe("02-09-2026-09-07-14-2.jpg");
  });
});

describe("employeeZipFilename", () => {
  it("combines name and birth year", () => {
    expect(employeeZipFilename("Yash K", 1994)).toBe("Yash K - 1994.zip");
  });

  it("omits the year when unknown", () => {
    expect(employeeZipFilename("Yash K", null)).toBe("Yash K.zip");
  });

  it("strips filesystem-unsafe characters from the name", () => {
    expect(employeeZipFilename('Weird/Name:*?"<>|', 2000)).toBe("WeirdName - 2000.zip");
  });
});
