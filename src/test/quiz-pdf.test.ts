import { describe, expect, it } from "vitest";
import { noteOn10, quizAdvice, quizNumber } from "@/lib/quiz-history";
import { quizPdfName } from "@/lib/quiz-pdf";

describe("PDF du quiz", () => {
  it("a un nom de fichier différent du bulletin, avec numéro et date", () => {
    expect(quizPdfName({ played_at: "2026-11-21T10:51:00Z" }, 3)).toBe("vetocare-quiz-3-2026-11-21.pdf");
    expect(quizPdfName({ played_at: "2026-11-21T10:51:00Z" }, 3)).not.toBe("vetocare-bulletin.pdf");
  });
  it("numérote les quiz du plus ancien (n°1) au plus récent", () => {
    const list = [
      { id: "c", played_at: "2026-11-21T10:00:00Z" },
      { id: "a", played_at: "2026-11-19T10:00:00Z" },
      { id: "b", played_at: "2026-11-20T10:00:00Z" },
    ];
    expect(quizNumber(list, "a")).toBe(1);
    expect(quizNumber(list, "c")).toBe(3);
  });
  it("donne la note sur 10", () => {
    expect(noteOn10(4, 10)).toBe(4);
    expect(noteOn10(7, 20)).toBe(3.5);
  });
  it("conseille d'étudier sous 50 %", () => {
    expect(quizAdvice(40)).toMatch(/^Efforcez-vous d'étudier/);
    expect(quizAdvice(95)).toMatch(/^Excellent/);
  });
});
