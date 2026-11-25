import { describe, expect, it } from "vitest";
import { isDark } from "@/lib/theme";

describe("apparence : clair, sombre, automatique", () => {
  it("« Sombre » reste sombre même si l’appareil est en clair", () => {
    expect(isDark("dark", false)).toBe(true);
  });
  it("« Clair » reste clair même si l’appareil est en sombre", () => {
    expect(isDark("light", true)).toBe(false);
  });
  it("« Automatique » suit le réglage de l’appareil", () => {
    expect(isDark("system", true)).toBe(true);
    expect(isDark("system", false)).toBe(false);
  });
});
