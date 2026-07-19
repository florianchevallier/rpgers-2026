import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("fusionne les classes et déduplique Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", undefined, false && "hidden", "block")).toBe(
      "text-red-500 block",
    );
  });
});
