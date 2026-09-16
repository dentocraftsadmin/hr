import { describe, it, expect } from "vitest";
import { formatPersonName } from "./name";

describe("formatPersonName", () => {
  it("capitalizes a lowercase name", () => {
    expect(formatPersonName("john doe")).toBe("John Doe");
  });

  it("normalizes an all-uppercase name", () => {
    expect(formatPersonName("JOHN DOE")).toBe("John Doe");
  });

  it("leaves an already-correct name unchanged", () => {
    expect(formatPersonName("John Doe")).toBe("John Doe");
  });

  it("handles mixed/irregular casing", () => {
    expect(formatPersonName("jOhN dOe")).toBe("John Doe");
  });

  it("collapses repeated internal whitespace and trims", () => {
    expect(formatPersonName("  john   doe  ")).toBe("John Doe");
  });

  it("capitalizes each part of a hyphenated name", () => {
    expect(formatPersonName("mary-jane smith")).toBe("Mary-Jane Smith");
  });

  it("capitalizes each part of an apostrophe'd name", () => {
    expect(formatPersonName("o'brien")).toBe("O'Brien");
  });

  it("handles a single name", () => {
    expect(formatPersonName("madonna")).toBe("Madonna");
  });
});
