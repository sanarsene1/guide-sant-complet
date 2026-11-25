import { describe, expect, it } from "vitest";

import {
  RESULT_LOADING_MS,
  countCorrectAnswers,
  formatClock,
  quizDurationSeconds,
  scorePercent,
  shouldConfirmQuizExit,
} from "../../public/site/assets/quiz-core.js";

const questionsAtLevel = (niveau: string, count = 10) => Array.from({ length: count }, () => ({ niveau }));

describe("Durée du quiz selon les questions tirées", () => {
  it("accorde 5 minutes à 10 questions faciles", () => {
    expect(quizDurationSeconds(questionsAtLevel("facile"))).toBe(300);
  });

  it("accorde 7 min 30 à 10 questions normales", () => {
    expect(quizDurationSeconds(questionsAtLevel("normal"))).toBe(450);
  });

  it("accorde 10 minutes à 10 questions difficiles", () => {
    expect(quizDurationSeconds(questionsAtLevel("difficile"))).toBe(600);
  });

  it("accorde 11 min 40 à 10 questions expertes, donc moins de 12 minutes", () => {
    expect(quizDurationSeconds(questionsAtLevel("expert"))).toBe(700);
    expect(quizDurationSeconds(questionsAtLevel("expert"))).toBeLessThan(12 * 60);
  });

  it("adapte la durée au mélange de niveaux réellement tiré", () => {
    const mixed = [...questionsAtLevel("facile", 5), ...questionsAtLevel("expert", 5)];
    expect(quizDurationSeconds(mixed)).toBe(500);
  });

  it("accorde 15 minutes à 20 questions normales", () => {
    expect(quizDurationSeconds(questionsAtLevel("normal", 20))).toBe(900);
  });

  it("ne descend jamais sous 3 minutes", () => {
    expect(quizDurationSeconds(questionsAtLevel("facile", 1))).toBe(180);
  });

  it("ne dépasse jamais 20 minutes", () => {
    expect(quizDurationSeconds(questionsAtLevel("expert", 20))).toBe(1200);
  });
});

describe("Résultat du quiz", () => {
  it("calcule le pourcentage de réussite", () => {
    expect(scorePercent(8, 10)).toBe(80);
  });

  it("affiche le temps sous forme de minutes et secondes", () => {
    expect(formatClock(700)).toBe("11:40");
  });

  it("attend 5 secondes avant de présenter le résultat", () => {
    expect(RESULT_LOADING_MS).toBe(5000);
  });

  it("compte uniquement la dernière réponse sélectionnée", () => {
    const question = { choice: 0, r: [{ ok: true }, { ok: false }] };
    question.choice = 1;
    expect(countCorrectAnswers([question])).toBe(0);
  });
});

describe("Sortie du quiz", () => {
  it("demande confirmation tant que le quiz est en cours", () => {
    expect(shouldConfirmQuizExit(true)).toBe(true);
  });

  it("laisse quitter librement une fois le quiz terminé", () => {
    expect(shouldConfirmQuizExit(false)).toBe(false);
  });
});
