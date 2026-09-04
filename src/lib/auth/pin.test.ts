import { describe, it, expect } from "vitest";
import { toAuthPassword } from "./pin";

describe("toAuthPassword", () => {
  it("produces a string at or above Supabase's 6-character password minimum", () => {
    expect(toAuthPassword("1234").length).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic for the same PIN", () => {
    expect(toAuthPassword("1234")).toBe(toAuthPassword("1234"));
  });

  it("differs for different PINs", () => {
    expect(toAuthPassword("1234")).not.toBe(toAuthPassword("4321"));
  });
});
