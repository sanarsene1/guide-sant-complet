import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COURSES } from "@/lib/formations";
import { stepImage } from "@/lib/formations/images";

describe("photos des formations", () => {
  it("chaque formation a une photo pour l'introduction et pour chaque chapitre", () => {
    for (const c of COURSES) {
      for (const step of ["intro", ...c.chapters.map((ch) => ch.id)]) {
        const file = resolve(__dirname, "../../public", stepImage(c.id, step).slice(1));
        expect(existsSync(file), `${c.id} ${step}`).toBe(true);
      }
    }
  });
});
