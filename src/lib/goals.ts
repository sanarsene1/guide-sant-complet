/** Règles des objectifs : comptage, fenêtre (jour ou semaine), atteinte et texte des notifications. */
import { CHAPTER_PASS_RATIO, type ChapterScores } from "./formations/grading";
import { addDays, localDate, localMidnight, localParts } from "./local-time";

export type GoalKind = "quiz" | "chapter";
export type GoalPeriod = "day" | "week";
export type Goal = {
  id: string;
  kind: GoalKind;
  target: number;
  period: GoalPeriod;
  remind_hour: number;
  time_zone: string;
  created_at: string;
  achieved_at: string | null;
  last_notified_on: string | null;
};

export const GOAL_PERIOD_LABEL: Record<GoalPeriod, string> = { day: "par jour", week: "par semaine" };

export function goalTitle(g: Pick<Goal, "kind" | "target" | "period">): string {
  const what = g.kind === "quiz" ? "quiz" : g.target > 1 ? "chapitres" : "chapitre";
  return `${g.target} ${what} ${GOAL_PERIOD_LABEL[g.period]}`;
}

/** Page à ouvrir depuis la notification. */
export const goalLink = (kind: GoalKind) => (kind === "quiz" ? "/site/quiz.html" : "/formations");

/** Début de la période en cours (minuit local du jour, ou du lundi pour la semaine). */
export function periodStart(now: Date, period: GoalPeriod, tz: string): Date {
  const today = localDate(now, tz);
  const day = period === "week" ? addDays(today, -localParts(now, tz).weekday) : today;
  return localMidnight(day, tz);
}

/** On compte à partir du début de la période, mais jamais avant la création de l'objectif. */
export function goalWindowStart(g: Pick<Goal, "period" | "time_zone" | "created_at">, now: Date): Date {
  const start = periodStart(now, g.period, g.time_zone).getTime();
  return new Date(Math.max(start, Date.parse(g.created_at)));
}

export function countQuizzes(quizzes: { played_at: string }[], since: Date): number {
  const t = since.getTime();
  return quizzes.filter((q) => Date.parse(q.played_at) >= t).length;
}

/** Chapitres validés (au moins le seuil de réussite) depuis « since ». */
export function countChapters(progress: { chapter_scores: ChapterScores }[], since: Date): number {
  const t = since.getTime();
  return progress.reduce(
    (n, p) =>
      n +
      Object.values(p.chapter_scores ?? {}).filter((s) => s && s.at && Date.parse(s.at) >= t && s.total > 0 && s.score / s.total >= CHAPTER_PASS_RATIO).length,
    0,
  );
}

export function goalProgress(
  g: Pick<Goal, "kind" | "period" | "time_zone" | "created_at">,
  quizzes: { played_at: string }[],
  progress: { chapter_scores: ChapterScores }[],
  now: Date,
): number {
  const since = goalWindowStart(g, now);
  return g.kind === "quiz" ? countQuizzes(quizzes, since) : countChapters(progress, since);
}

export const isGoalReached = (g: Pick<Goal, "target">, done: number) => done >= g.target;

/** Faut-il envoyer le rappel maintenant ? Une fois par jour, à l'heure choisie (ou plus tard ce jour-là). */
export function shouldRemindGoal(g: Pick<Goal, "remind_hour" | "time_zone" | "last_notified_on" | "achieved_at">, now: Date): boolean {
  if (g.achieved_at) return false;
  const today = localDate(now, g.time_zone);
  if (g.last_notified_on === today) return false;
  return localParts(now, g.time_zone).h >= g.remind_hour;
}

export function goalReminderText(g: Pick<Goal, "kind" | "target" | "period">, done: number) {
  const left = Math.max(0, g.target - done);
  const what = g.kind === "quiz" ? "quiz" : left > 1 ? "chapitres" : "chapitre";
  const when = g.period === "day" ? "aujourd’hui" : "cette semaine";
  return {
    title: "Votre objectif VetoCare",
    body: `Vous avez un objectif : ${goalTitle(g)}. Encore ${left} ${what} ${when} (${done}/${g.target}).`,
  };
}
