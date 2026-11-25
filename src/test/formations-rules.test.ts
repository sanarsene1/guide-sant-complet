import { describe, expect, it } from "vitest";
import { COURSES } from "@/lib/formations";
import {
  chapterPassed,
  chapterUnlocked,
  courseStatus,
  drawExam,
  examPassed,
  mention,
  noteOn20,
  resumeStep,
  quizPercent,
  QUIZ_QUESTIONS_BY_LEVEL,
} from "@/lib/formations/grading";

describe("formations", () => {
  it("propose 20 formations, dont 5 longues (48 h ou 1 semaine)", () => {
    expect(COURSES).toHaveLength(20);
    expect(COURSES.filter((c) => c.hours >= 40)).toHaveLength(5);
    for (const c of COURSES) expect(c.chapters.length).toBeGreaterThanOrEqual(3);
  });

  it("présente chaque formation : « Ce cours vous permettra », public, prérequis, objectifs", () => {
    for (const c of COURSES) {
      expect(c.introduction[0], c.id).toMatch(/^Ce cours vous permettra/);
      expect(c.audience.length, c.id).toBeGreaterThan(10);
      expect(c.prerequisites.length, c.id).toBeGreaterThan(0);
      expect(c.objectives.length, c.id).toBeGreaterThanOrEqual(5);
      for (const ch of c.chapters) expect(ch.sections.length, `${c.id}/${ch.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("met 20 questions de quiz pour une formation facile et 30 pour une difficile", () => {
    for (const c of COURSES) {
      const n = c.chapters.reduce((t, ch) => t + ch.quiz.length, 0);
      if (c.hours >= 40) expect(n, c.id).toBeGreaterThanOrEqual(QUIZ_QUESTIONS_BY_LEVEL[c.level]);
      else expect(n, c.id).toBe(QUIZ_QUESTIONS_BY_LEVEL[c.level]);
    }
    expect(QUIZ_QUESTIONS_BY_LEVEL.Débutant).toBe(20);
    expect(QUIZ_QUESTIONS_BY_LEVEL.Avancé).toBe(30);
  });

  it("tire 30 questions différentes à chaque examen", () => {
    for (const c of COURSES) {
      const qs = drawExam(c);
      expect(qs, c.id).toHaveLength(30);
      expect(new Set(qs.map((q) => q.q)).size, c.id).toBe(30);
    }
  });

  it("a des questions bien formées (4 choix, une bonne réponse)", () => {
    for (const c of COURSES) {
      const all = [...c.exam, ...c.chapters.flatMap((ch) => ch.quiz)];
      expect(new Set(all.map((q) => q.q)).size, c.id).toBe(all.length);
      for (const q of all) {
        expect(q.options, `${c.id}: ${q.q}`).toHaveLength(4);
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThan(4);
      }
    }
  });

  it("valide un quiz de chapitre à 70 %, pas en dessous", () => {
    expect(chapterPassed({ score: 14, total: 20 })).toBe(true);
    expect(chapterPassed({ score: 13, total: 20 })).toBe(false);
    expect(chapterPassed({ score: 7, total: 10 })).toBe(true);
    expect(chapterPassed({ score: 6, total: 10 })).toBe(false);
  });

  it("réussit l'examen à 70 % (21/30 = 14/20), pas à 20/30", () => {
    expect(noteOn20(21, 30)).toBe(14);
    expect(examPassed(noteOn20(21, 30))).toBe(true);
    expect(examPassed(noteOn20(20, 30))).toBe(false);
  });

  it("donne les mentions Assez bien, Bien, Très bien", () => {
    expect(mention(14)).toBe("Assez bien");
    expect(mention(16)).toBe("Bien");
    expect(mention(18)).toBe("Très bien");
    expect(mention(13.9)).toBe("Non admis");
  });

  it("ouvre les chapitres dans l'ordre et l'examen à la fin", () => {
    const c = COURSES[0]!;
    const [c1, c2, c3] = c.chapters.map((ch) => ch.id) as [string, string, string];
    expect(chapterUnlocked(c, {}, c1)).toBe(true);
    expect(chapterUnlocked(c, {}, c2)).toBe(false);
    const one = { [c1]: { score: 7, total: 7, at: "" } };
    expect(chapterUnlocked(c, one, c2)).toBe(true);
    expect(chapterUnlocked(c, one, c3)).toBe(false);
    expect(courseStatus(c, one, []).examUnlocked).toBe(false);
    const all = Object.fromEntries(c.chapters.map((ch) => [ch.id, { score: 10, total: 10, at: "" }]));
    expect(courseStatus(c, all, []).examUnlocked).toBe(true);
  });

  it("reprend la formation au premier chapitre non validé", () => {
    const c = COURSES[0]!;
    expect(resumeStep(c, {})).toBe("intro");
    expect(resumeStep(c, { c1: { score: 7, total: 7, at: "" }, c2: { score: 2, total: 7, at: "" } })).toBe("c2");
    const all = Object.fromEntries(c.chapters.map((ch) => [ch.id, { score: 10, total: 10, at: "" }]));
    expect(resumeStep(c, all)).toBe("exam");
  });

  it("compte la formation comme commencée dès le clic sur « Commencer »", () => {
    const c = COURSES[0]!;
    expect(courseStatus(c, {}, []).started).toBe(false);
    expect(courseStatus(c, {}, [], { c1: 0 }).started).toBe(true);
    expect(resumeStep(c, {}, { c1: 0 })).toBe("c1");
  });

  it("affiche le résultat d'un quiz en pourcentage arrondi", () => {
    expect(quizPercent(17, 20)).toBe(85);
    expect(quizPercent(2, 3)).toBe(67);
    expect(quizPercent(0, 0)).toBe(0);
  });
});
