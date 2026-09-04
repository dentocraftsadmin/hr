import { describe, it, expect } from "vitest";
import { scoreFromPoints } from "./points";

describe("scoreFromPoints", () => {
  it("starts at 100 with no ledger entries", () => {
    expect(scoreFromPoints(0)).toBe(100);
  });

  it("clamps at 0 for a large negative total", () => {
    expect(scoreFromPoints(-500)).toBe(0);
  });

  it("clamps at 100 even with positive adjustments", () => {
    expect(scoreFromPoints(50)).toBe(100);
  });

  it("reflects a partial deduction", () => {
    expect(scoreFromPoints(-15)).toBe(85);
  });
});
