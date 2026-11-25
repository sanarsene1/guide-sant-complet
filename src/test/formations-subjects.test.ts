import { describe, expect, it } from "vitest";
import { COURSES } from "@/lib/formations";
import { DURATIONS, SUBJECTS, subjectOf } from "@/lib/formations/subjects";

describe("catalogue des formations", () => {
  it("range chacune des 20 formations dans exactement un sujet", () => {
    const ids = SUBJECTS.flatMap((s) => [...s.courses]);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    for (const c of COURSES) expect(subjectOf(c.id)).toBeDefined();
  });
  it("chaque formation tombe dans un filtre de durée", () => {
    for (const c of COURSES) expect(DURATIONS.some((d) => d.test(c.hours))).toBe(true);
  });
});
