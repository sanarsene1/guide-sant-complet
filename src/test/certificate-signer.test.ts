import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { certificateFields, CERTIFICATE_SIGNER } from "@/lib/formations/certificate";
import { courseById } from "@/lib/formations";

const exam = { id: "e1", course_id: "premiers-secours", score: 18, total: 20, note: 18, passed: true, created_at: "2026-11-21T10:00:00Z" };

describe("brevet : signataire", () => {
  it("le brevet est signé par Samuel Muhitwa Samuel, Directeur de VetoCare", () => {
    const f = certificateFields(courseById("premiers-secours")!, exam, "Marie");
    expect(f.signerName).toBe("Samuel Muhitwa Samuel");
    expect(f.signerTitle).toBe("Directeur de VetoCare");
    expect(CERTIFICATE_SIGNER.name).toBe("Samuel Muhitwa Samuel");
  });

  it("les pages de formation n'affichent plus l'avertissement vétérinaire", () => {
    const src = readFileSync("src/routes/formations.$courseId.tsx", "utf8");
    expect(src).not.toContain("EduNotice");
    expect(src).not.toContain("il ne remplace pas un vétérinaire");
  });

  it("le brevet n'affiche ni la note finale ni le niveau", () => {
    const card = readFileSync("src/components/formations/certificate-card.tsx", "utf8");
    const pdf = readFileSync("src/lib/formations/pdf.ts", "utf8");
    for (const src of [card, pdf]) {
      expect(src).not.toMatch(/Note finale|NOTE FINALE/);
      expect(src).not.toMatch(/"Niveau"|NIVEAU/);
    }
    const f = certificateFields(courseById("premiers-secours")!, exam, "Marie");
    expect(f).not.toHaveProperty("note");
    expect(f).not.toHaveProperty("level");
    expect(f.mention).toBe("Très bien");
    expect(f.percent).toBe(90);
  });

  it("le brevet porte la signature du directeur (image PNG transparente) à l'écran et dans le PDF", () => {
    expect(CERTIFICATE_SIGNER.signature.startsWith("data:image/png;base64,")).toBe(true);
    expect(readFileSync("src/lib/formations/pdf.ts", "utf8")).toContain("addImage(CERTIFICATE_SIGNER.signature");
    expect(readFileSync("src/components/formations/certificate-card.tsx", "utf8")).toContain("CERTIFICATE_SIGNER.signature");
  });
});

describe("rappels : animal écrit par l'utilisateur", () => {
  it("le formulaire de rappel ne propose plus la liste des animaux enregistrés", () => {
    const src = readFileSync("src/components/account/sections-life.tsx", "utf8");
    const form = src.slice(src.indexOf("export function Reminders"));
    expect(form).not.toContain("data.pets.map((p) => <option");
    expect(form).toContain("pet_id: null");
  });
});
