/**
 * Quiz history shared by the static quiz page and the account page.
 * The static quiz (public/site/assets/quiz.js) has no auth client, so it queues
 * finished quizzes in localStorage under PENDING_QUIZ_KEY, tagged with the
 * signed-in visitor's id; the account page uploads them for that visitor only.
 */
export const PENDING_QUIZ_KEY = "vc-quiz-pending";

export type QuizQuestionRecord = {
  q: string;
  options: string[];
  correct: number;
  choice: number | null;
  exp: string;
  cat?: string;
  niveau?: string;
};

export type QuizAttempt = {
  id: string;
  played_at: string;
  species: string;
  species_label: string;
  level: string;
  level_label: string;
  score: number;
  total: number;
  elapsed_seconds: number;
  limit_seconds: number;
  timed_out: boolean;
  questions: QuizQuestionRecord[];
};

export type PendingQuiz = QuizAttempt & { uid: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const int = (v: unknown, max = 100000) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0;
const text = (v: unknown, fallback = "", max = 600) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

/** Cleans one queued quiz; returns null when it is not a usable record. */
export function cleanPending(raw: unknown): PendingQuiz | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = text(r["id"]);
  const uid = text(r["uid"]);
  if (!UUID.test(id) || !uid) return null;
  const questions = Array.isArray(r["questions"])
    ? (r["questions"] as unknown[]).slice(0, 100).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const x = item as Record<string, unknown>;
        const options = Array.isArray(x["options"]) ? (x["options"] as unknown[]).map((o) => text(o)).slice(0, 8) : [];
        if (!text(x["q"]) || options.length < 2) return [];
        const choice = typeof x["choice"] === "number" && x["choice"] >= 0 && x["choice"] < options.length ? x["choice"] : null;
        const rec: QuizQuestionRecord = {
          q: text(x["q"]),
          options,
          correct: Math.min(options.length - 1, int(x["correct"])),
          choice,
          exp: text(x["exp"], "", 1200),
        };
        const cat = text(x["cat"], "", 40);
        const niveau = text(x["niveau"], "", 20);
        if (cat) rec.cat = cat;
        if (niveau) rec.niveau = niveau;
        return [rec];
      })
    : [];
  const total = Math.min(100, questions.length || int(r["total"], 100));
  const score = Math.min(total, int(r["score"], 100));
  const played = text(r["played_at"]);
  return {
    id,
    uid,
    played_at: played && !Number.isNaN(Date.parse(played)) ? played : new Date().toISOString(),
    species: text(r["species"], "tous", 40),
    species_label: text(r["species_label"], "Tous les animaux", 80),
    level: text(r["level"], "tous", 20),
    level_label: text(r["level_label"], "Mélange", 40),
    score,
    total,
    elapsed_seconds: int(r["elapsed_seconds"]),
    limit_seconds: int(r["limit_seconds"]),
    timed_out: r["timed_out"] === true,
    questions,
  };
}

/** Splits the queue into this visitor's quizzes and the ones to keep for someone else. */
export function splitPending(raw: unknown, uid: string): { mine: PendingQuiz[]; others: unknown[] } {
  const list = Array.isArray(raw) ? raw : [];
  const mine: PendingQuiz[] = [];
  const others: unknown[] = [];
  for (const item of list) {
    const clean = cleanPending(item);
    if (clean && clean.uid === uid) mine.push(clean);
    else if (clean) others.push(item);
  }
  return { mine, others };
}

export const percentOf = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : 0);

export type SpeciesProgress = { species: string; label: string; count: number; average: number; best: number };
export type QuizStats = { count: number; average: number; best: number; perfect: number; species: SpeciesProgress[] };

/** Totals for the overview: averages are rounded percentages of right answers. */
export function quizStats(attempts: Pick<QuizAttempt, "species" | "species_label" | "score" | "total">[]): QuizStats {
  const pct = attempts.map((a) => percentOf(a.score, a.total));
  const groups = new Map<string, { label: string; values: number[] }>();
  attempts.forEach((a, i) => {
    const g = groups.get(a.species) ?? { label: a.species_label, values: [] };
    g.values.push(pct[i] ?? 0);
    groups.set(a.species, g);
  });
  const avg = (v: number[]) => (v.length ? Math.round(v.reduce((s, n) => s + n, 0) / v.length) : 0);
  return {
    count: attempts.length,
    average: avg(pct),
    best: pct.length ? Math.max(...pct) : 0,
    perfect: pct.filter((p) => p === 100).length,
    species: [...groups.entries()]
      .map(([species, g]) => ({ species, label: g.label, count: g.values.length, average: avg(g.values), best: Math.max(...g.values) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr")),
  };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return m ? `${m} min ${String(s % 60).padStart(2, "0")} s` : `${s} s`;
}

export function formatPlayedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Quiz number in the visitor's history: the oldest quiz is n°1. */
export function quizNumber(attempts: Pick<QuizAttempt, "id" | "played_at">[], id: string): number {
  const sorted = [...attempts].sort((a, b) => a.played_at.localeCompare(b.played_at) || a.id.localeCompare(b.id));
  const i = sorted.findIndex((a) => a.id === id);
  return i < 0 ? 1 : i + 1;
}

/** Mark out of 10, rounded to half a point (4 right out of 10 → 4). */
export function noteOn10(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 20) / 2 : 0;
}

/** Short advice printed under the quiz result, from the success percentage. */
export function quizAdvice(percent: number): string {
  if (percent >= 90) return "Excellent ! Vous maîtrisez très bien ce sujet. Essayez un niveau plus difficile.";
  if (percent >= 70) return "Très bien. Relisez les quelques questions à revoir pour atteindre le sans-faute.";
  if (percent >= 50) return "Pas mal. Revoyez les corrections ci-dessous, puis refaites le quiz pour progresser.";
  return "Efforcez-vous d'étudier les fiches animaux, maladies et conseils, puis refaites le quiz : chaque correction ci-dessous vous aide à progresser.";
}
