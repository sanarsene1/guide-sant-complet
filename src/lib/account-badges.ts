import { COURSES } from "./formations";
import { chapterPassed, courseStatus, type ChapterScores, type ExamResult } from "./formations/grading";
import { percentOf } from "./quiz-history";

export type BadgeInput = {
  quizzes: { score: number; total: number; species: string }[];
  progress: Record<string, ChapterScores>;
  exams: ExamResult[];
  pets: number;
  remindersDone: number;
};
export type Badge = { id: string; title: string; text: string; earned: boolean };

/** Badges gagnés en utilisant le site (calculés à partir des données du compte). */
export function computeBadges(d: BadgeInput): Badge[] {
  const chapters = Object.values(d.progress).reduce((n, s) => n + Object.values(s).filter((x) => chapterPassed(x)).length, 0);
  const brevets = COURSES.filter((c) => courseStatus(c, d.progress[c.id], d.exams).passed).length;
  const species = new Set(d.quizzes.map((q) => q.species).filter((s) => s !== "tous")).size;
  const b = (id: string, title: string, text: string, earned: boolean): Badge => ({ id, title, text, earned });
  return [
    b("quiz-1", "Premier quiz", "Terminer un quiz", d.quizzes.length >= 1),
    b("quiz-10", "Habitué des quiz", "Terminer 10 quiz", d.quizzes.length >= 10),
    b("perfect", "Sans faute", "Obtenir 100 % à un quiz", d.quizzes.some((q) => q.total > 0 && percentOf(q.score, q.total) === 100)),
    b("species-5", "Polyvalent", "Faire des quiz sur 5 animaux différents", species >= 5),
    b("chapter-1", "Premier chapitre", "Valider un chapitre de formation", chapters >= 1),
    b("chapter-15", "Lecteur assidu", "Valider 15 chapitres", chapters >= 15),
    b("brevet-1", "Premier brevet", "Réussir un examen final", brevets >= 1),
    b("brevet-3", "Triple brevet", "Obtenir 3 brevets", brevets >= 3),
    b("tres-bien", "Mention Très bien", "Obtenir 18/20 ou plus à un examen", d.exams.some((e) => e.note >= 18)),
    b("all", "Grand diplômé", "Obtenir le brevet de toutes les formations", brevets >= COURSES.length),
    b("pet", "Ami des bêtes", "Ajouter un animal à son compte", d.pets >= 1),
    b("reminder", "Bien organisé", "Cocher un rappel de soin comme fait", d.remindersDone >= 1),
  ];
}
