/**
 * Règles des formations : validation des chapitres, note d’examen sur 20, mention et brevet.
 * Gardées ici (fonctions pures) pour que la page de formation, Mon compte et les PDF disent la même chose.
 */
import type { Course } from "./types";

/** Un chapitre est validé quand son quiz obtient au moins 70 % de bonnes réponses. */
export const CHAPTER_PASS_RATIO = 0.7;
/** Le brevet s’obtient avec au moins 70 % à l’examen final, soit 14/20. */
export const EXAM_PASS_NOTE = 14;
/** Nombre de questions tirées au sort pour chaque examen final. */
export const EXAM_QUESTIONS = 30;
/** Nombre total de questions des quiz de chapitres selon le niveau (Débutant = facile, Avancé = difficile). */
export const QUIZ_QUESTIONS_BY_LEVEL = { Débutant: 20, Intermédiaire: 24, Avancé: 30 } as const;

export type ChapterScores = Record<string, { score: number; total: number; at: string }>;
export type ExamResult = { id: string; course_id: string; score: number; total: number; note: number; passed: boolean; created_at: string };

export const chapterPassed = (s: { score: number; total: number } | undefined) =>
  !!s && s.total > 0 && s.score / s.total >= CHAPTER_PASS_RATIO - 1e-9;

/** Note sur 20 arrondie au dixième. */
export const noteOn20 = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 200) / 10 : 0);

export const examPassed = (note: number) => note >= EXAM_PASS_NOTE;

export function mention(note: number): string {
  if (note >= 18) return "Très bien";
  if (note >= 16) return "Bien";
  if (note >= EXAM_PASS_NOTE) return "Assez bien";
  return "Non admis";
}

export type CourseStatus = {
  chaptersDone: number;
  chaptersTotal: number;
  /** 0–100 : chapitres validés + examen réussi (l’examen compte comme une étape). */
  percent: number;
  examUnlocked: boolean;
  bestExam: ExamResult | null;
  passed: boolean;
  started: boolean;
};

/** Lecture par chapitre : nombre de parties lues (une clé présente = formation commencée). */
export type ReadProgress = Record<string, number>;

/** Une formation est commencée dès qu’on a cliqué « Commencer » (lecture enregistrée) ou passé un quiz. */
export const courseStarted = (scores: ChapterScores | undefined, read?: ReadProgress) =>
  (!!scores && Object.keys(scores).length > 0) || (!!read && Object.keys(read).length > 0);

/** Pourcentage de bonnes réponses, arrondi à l’unité. */
export const quizPercent = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : 0);

export function courseStatus(course: Course, scores: ChapterScores | undefined, exams: ExamResult[], read?: ReadProgress): CourseStatus {
  const mine = exams.filter((e) => e.course_id === course.id);
  const chaptersDone = course.chapters.filter((c) => chapterPassed(scores?.[c.id])).length;
  const best = mine.reduce<ExamResult | null>((b, e) => (!b || e.note > b.note ? e : b), null);
  const passed = !!best && best.passed;
  const steps = course.chapters.length + 1;
  return {
    chaptersDone,
    chaptersTotal: course.chapters.length,
    percent: Math.round(((chaptersDone + (passed ? 1 : 0)) / steps) * 100),
    examUnlocked: chaptersDone === course.chapters.length,
    bestExam: best,
    passed,
    started: courseStarted(scores, read),
  };
}

/** Numéro de brevet stable, tiré de l’examen réussi. */
export const certificateNumber = (exam: Pick<ExamResult, "id" | "created_at">) =>
  `VC-${exam.created_at.slice(0, 4)}-${exam.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

/** Les chapitres s’ouvrent dans l’ordre : le chapitre n s’ouvre quand le chapitre n-1 est validé. */
export function chapterUnlocked(course: Course, scores: ChapterScores | undefined, chapterId: string): boolean {
  const i = course.chapters.findIndex((c) => c.id === chapterId);
  if (i < 0) return false;
  return course.chapters.slice(0, i).every((c) => chapterPassed(scores?.[c.id]));
}

/** Étape où reprendre la formation : premier chapitre non validé, sinon l’examen. */
export function resumeStep(course: Course, scores: ChapterScores | undefined, read?: ReadProgress): string {
  if (!courseStarted(scores, read)) return "intro";
  return course.chapters.find((c) => !chapterPassed(scores?.[c.id]))?.id ?? "exam";
}

/** Banque de l’examen : questions d’examen + questions des chapitres. */
export const examPool = (course: Course) => [...course.exam, ...course.chapters.flatMap((c) => c.quiz)];

/** Tire au sort les questions d’un examen (questions d’examen en priorité, complétées par celles des chapitres). */
export function drawExam(course: Course, rand: () => number = Math.random) {
  const shuffle = <T,>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [b[i], b[j]] = [b[j]!, b[i]!];
    }
    return b;
  };
  const fromChapters = shuffle(course.chapters.flatMap((c) => c.quiz)).slice(0, Math.max(0, EXAM_QUESTIONS - course.exam.length));
  return shuffle([...course.exam.slice(0, EXAM_QUESTIONS), ...fromChapters]);
}

/** Durée lisible : « 1 semaine · 40 h », « 48 h · 6 jours », « 4 h ». */
export function durationLabel(hours: number): string {
  if (hours >= 40 && hours < 48) return `1 semaine · ${hours} h`;
  if (hours >= 24) return `${hours} h · ${Math.round(hours / 8)} jours`;
  return `${hours} h`;
}

/** Une partie de chapitre se lit dans l’ordre : on ne voit que les parties déjà validées + la suivante. */
export const chapterRead = (sectionsCount: number, read: number | undefined) => (read ?? 0) >= sectionsCount;
