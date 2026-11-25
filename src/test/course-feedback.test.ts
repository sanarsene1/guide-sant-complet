import { describe, expect, it } from "vitest";
import { COURSES } from "@/lib/formations";
import { FEEDBACK_QUESTIONS, feedbackComplete, feedbackQuestions, feedbackRequired } from "@/lib/formations/feedback";

describe("avis de fin de formation", () => {
  it("pose exactement 10 questions Oui / Non pour chaque formation, sans doublon", () => {
    expect(FEEDBACK_QUESTIONS).toBe(10);
    for (const c of COURSES) {
      const q = feedbackQuestions(c);
      expect(q, c.id).toHaveLength(10);
      expect(new Set(q.map((x) => x.id)).size, c.id).toBe(10);
    }
  });

  it("demande si la formation est difficile et parle des langues, vidéos et photos", () => {
    const ids = feedbackQuestions(COURSES[0]!).map((x) => x.id);
    expect(ids[0]).toBe("difficile");
    expect(ids).toEqual(expect.arrayContaining(["langue", "videos", "photos"]));
  });

  it("pose des questions sur les chapitres de la formation", () => {
    const c = COURSES[0]!;
    const q = feedbackQuestions(c);
    expect(q.some((x) => x.q.includes(c.chapters[0]!.title))).toBe(true);
  });

  it("n'est complet que quand les 10 questions ont une réponse", () => {
    const q = feedbackQuestions(COURSES[0]!);
    const nine = Object.fromEntries(q.slice(0, 9).map((x) => [x.id, true]));
    expect(feedbackComplete(q, nine)).toBe(false);
    expect(feedbackComplete(q, { ...nine, [q[9]!.id]: false })).toBe(true);
  });

  it("est demandé avant l'examen final, sauf si l'avis est déjà donné ou le brevet obtenu", () => {
    expect(feedbackRequired(false, false)).toBe(true);
    expect(feedbackRequired(true, false)).toBe(false);
    expect(feedbackRequired(false, true)).toBe(false);
  });
});
