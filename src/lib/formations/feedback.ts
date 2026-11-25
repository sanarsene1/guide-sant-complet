/**
 * Avis de fin de formation : 10 questions Oui / Non posées après le dernier chapitre,
 * avant l’examen final. Une partie des questions dépend des chapitres de la formation.
 */
import type { Course } from "./types";

/** Nombre de questions de l’avis, toujours le même pour chaque formation. */
export const FEEDBACK_QUESTIONS = 10;
/** Nombre maximum de questions consacrées aux chapitres. */
const MAX_CHAPTER_QUESTIONS = 4;

export type FeedbackQuestion = { id: string; q: string };
/** Réponses : true = Oui, false = Non. */
export type FeedbackAnswers = Record<string, boolean>;

const GENERAL: FeedbackQuestion[] = [
  { id: "difficile", q: "Avez-vous trouvé cette formation difficile ?" },
  { id: "langue", q: "Aimeriez-vous suivre cette formation dans une autre langue (lingala, swahili, anglais…) ?" },
  { id: "videos", q: "Aimeriez-vous plus de vidéos dans les chapitres ?" },
  { id: "photos", q: "Aimeriez-vous plus de photos et d’images pour illustrer le cours ?" },
  { id: "utile", q: "Cette formation vous sera-t-elle utile avec vos animaux ou dans votre travail ?" },
  { id: "recommande", q: "Recommanderiez-vous cette formation à un proche ?" },
];
const EXTRA: FeedbackQuestion[] = [
  { id: "quiz", q: "Les quiz vous ont-ils aidé à retenir l’essentiel ?" },
  { id: "duree", q: "La durée de la formation vous a-t-elle paru adaptée ?" },
  { id: "exemples", q: "Voudriez-vous plus d’exemples pratiques et de cas réels ?" },
  { id: "rythme", q: "La lecture page par page vous a-t-elle convenu ?" },
];

/** Les 10 questions de l’avis : « difficile » d’abord, puis les chapitres, puis les questions générales. */
export function feedbackQuestions(course: Course): FeedbackQuestion[] {
  const chapters = course.chapters.slice(0, MAX_CHAPTER_QUESTIONS).map((c, i) => ({
    id: `ch-${c.id}`,
    q: `Le chapitre ${i + 1} « ${c.title} » était-il facile à comprendre ?`,
  }));
  const [first, ...rest] = GENERAL;
  const list = [first!, ...chapters, ...rest];
  for (const x of EXTRA) if (list.length < FEEDBACK_QUESTIONS) list.push(x);
  return list.slice(0, FEEDBACK_QUESTIONS);
}

/** L’avis est complet quand chaque question a reçu Oui ou Non. */
export const feedbackComplete = (questions: FeedbackQuestion[], answers: FeedbackAnswers | undefined) =>
  !!answers && questions.every((x) => typeof answers[x.id] === "boolean");

/** L’avis est demandé avant l’examen final, sauf si le brevet est déjà obtenu. */
export const feedbackRequired = (given: boolean, passed: boolean) => !given && !passed;

/** Adresse qui reçoit, en PDF, chaque avis de fin de formation. */
export const FEEDBACK_RECIPIENT = "arsenenzanzu19@gmail.com";
