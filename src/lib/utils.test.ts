import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("text-sm")).toBe("text-sm");
  });

  it("merges multiple classes", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("resolves conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("handles conditional classes via objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
    expect(cn("base", { active: false })).toBe("base");
  });

  it("handles conditional classes via arrays", () => {
    expect(cn(["text-sm", "font-bold"])).toBe("text-sm font-bold");
  });

  it("ignores falsy values", () => {
    expect(cn("text-sm", undefined, null, false, "font-bold")).toBe(
      "text-sm font-bold"
    );
  });

  it("returns empty string when given no arguments", () => {
    expect(cn()).toBe("");
  });
});
