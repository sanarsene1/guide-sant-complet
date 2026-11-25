/** Lecture / écriture des données du compte (chaque requête est limitée à la personne connectée par la base). */
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { ACCOUNT_CACHE_KEY, accountSummary } from "./auth-helpers";
import type { ChapterScores, ExamResult } from "./formations/grading";
import type { FeedbackAnswers } from "./formations/feedback";
import { PENDING_QUIZ_KEY, splitPending, type QuizAttempt } from "./quiz-history";
import type { Goal, GoalKind, GoalPeriod } from "./goals";
import { browserTimeZone } from "./local-time";

export type CourseProgressRow = {
  course_id: string;
  chapter_scores: ChapterScores;
  read_sections: ReadSections;
  favorite: boolean;
  notes: string;
  started_at: string;
  updated_at: string;
};
/** Parties lues par chapitre : { c1: 3 } = les 3 premières parties du chapitre c1 sont lues. */
export type ReadSections = Record<string, number>;
export type Pet = { id: string; name: string; species: string; category: string; birth_date: string | null; notes: string; created_at: string };
export type CourseNote = { id: string; course_id: string; course_title: string; body: string; created_at: string; updated_at: string };
export type Reminder = { id: string; pet_id: string | null; pet_label: string; title: string; kind: string; due_date: string; remind_hour: number | null; done: boolean; created_at: string };

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Garde le menu du site statique (prénom + photo) à jour. */
export function syncAccountCache(session: Session | null) {
  try {
    if (session) localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(accountSummary(session.user)));
    else localStorage.removeItem(ACCOUNT_CACHE_KEY);
  } catch {
    /* stockage indisponible */
  }
}

/** Envoie les quiz terminés sur le site statique (file locale) dans le compte de cette personne. */
export async function syncPendingQuizzes(uid: string): Promise<number> {
  let raw: unknown = [];
  try {
    raw = JSON.parse(localStorage.getItem(PENDING_QUIZ_KEY) || "[]");
  } catch {
    return 0;
  }
  const { mine, others } = splitPending(raw, uid);
  if (!mine.length) return 0;
  const rows = mine.map(({ uid: _u, questions, ...q }) => ({ ...q, questions: questions as unknown as Json }));
  const { error } = await supabase.from("quiz_attempts").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  fail(error);
  localStorage.setItem(PENDING_QUIZ_KEY, JSON.stringify(others));
  return mine.length;
}

export async function listQuizAttempts(): Promise<QuizAttempt[]> {
  const { data, error } = await supabase.from("quiz_attempts").select("*").order("played_at", { ascending: false }).limit(500);
  fail(error);
  return (data ?? []).map((r) => ({ ...r, questions: (r.questions ?? []) as unknown as QuizAttempt["questions"] }));
}

export async function deleteQuizAttempt(id: string) {
  fail((await supabase.from("quiz_attempts").delete().eq("id", id)).error);
}

export async function deleteAllQuizAttempts(uid: string) {
  fail((await supabase.from("quiz_attempts").delete().eq("user_id", uid)).error);
}

export async function listProgress(): Promise<CourseProgressRow[]> {
  const { data, error } = await supabase.from("course_progress").select("*");
  fail(error);
  return (data ?? []).map((r) => ({ ...r, chapter_scores: (r.chapter_scores ?? {}) as unknown as ChapterScores, read_sections: (r.read_sections ?? {}) as unknown as ReadSections }));
}

async function upsertProgress(uid: string, courseId: string, patch: Partial<Omit<CourseProgressRow, "course_id">>) {
  const { error } = await supabase
    .from("course_progress")
    .upsert(
      { user_id: uid, course_id: courseId, ...patch, chapter_scores: patch.chapter_scores as unknown as Json, ...(patch.read_sections ? { read_sections: patch.read_sections as unknown as Json } : {}), updated_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" },
    );
  fail(error);
}

/** Garde le meilleur score de chaque chapitre. */
export async function saveChapterScore(uid: string, courseId: string, current: ChapterScores, chapterId: string, score: number, total: number) {
  const prev = current[chapterId];
  const next: ChapterScores = { ...current };
  if (!prev || score / total >= prev.score / prev.total) next[chapterId] = { score, total, at: new Date().toISOString() };
  await upsertProgress(uid, courseId, { chapter_scores: next });
  return next;
}

export async function saveCourseMeta(uid: string, courseId: string, scores: ChapterScores, patch: { favorite?: boolean; notes?: string }) {
  await upsertProgress(uid, courseId, { chapter_scores: scores, ...patch });
}

/** Enregistre la progression de lecture d’un chapitre (jamais en arrière). */
export async function saveReadSections(uid: string, courseId: string, scores: ChapterScores, current: ReadSections, chapterId: string, count: number) {
  const next: ReadSections = { ...current, [chapterId]: Math.max(current[chapterId] ?? 0, count) };
  await upsertProgress(uid, courseId, { chapter_scores: scores, read_sections: next });
  return next;
}

export async function listExams(): Promise<ExamResult[]> {
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("id, course_id, score, total, note, passed, created_at")
    .order("created_at", { ascending: false });
  fail(error);
  return (data ?? []).map((r) => ({ ...r, note: Number(r.note) }));
}

export async function saveExam(e: { course_id: string; score: number; total: number; note: number; passed: boolean; answers: (number | null)[] }) {
  const { data, error } = await supabase
    .from("exam_attempts")
    .insert({ ...e, answers: e.answers as unknown as Json })
    .select("id, course_id, score, total, note, passed, created_at")
    .single();
  fail(error);
  return { ...data!, note: Number(data!.note) } as ExamResult;
}

/** Avis de fin de formation déjà donné par la personne connectée (null si pas encore). */
export async function getCourseFeedback(courseId: string): Promise<FeedbackAnswers | null> {
  const { data, error } = await supabase.from("course_feedback").select("answers").eq("course_id", courseId).maybeSingle();
  fail(error);
  return data ? (data.answers as FeedbackAnswers) : null;
}

export async function saveCourseFeedback(uid: string, courseId: string, answers: FeedbackAnswers, comment: string) {
  const { error } = await supabase
    .from("course_feedback")
    .upsert({ user_id: uid, course_id: courseId, answers: answers as unknown as Json, comment: comment.trim().slice(0, 1000) }, { onConflict: "user_id,course_id" });
  fail(error);
}

export async function listPets(): Promise<Pet[]> {
  const { data, error } = await supabase.from("pets").select("id, name, species, category, birth_date, notes, created_at").order("created_at");
  fail(error);
  return data ?? [];
}
export async function savePet(p: { id?: string; name: string; species: string; category: string; birth_date: string | null; notes: string }) {
  if (p.id) fail((await supabase.from("pets").update(p).eq("id", p.id)).error);
  else fail((await supabase.from("pets").insert(p)).error);
}
export async function deletePet(id: string) {
  fail((await supabase.from("pets").delete().eq("id", id)).error);
}

export async function listReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("pet_reminders")
    .select("id, pet_id, pet_label, title, kind, due_date, remind_hour, done, created_at")
    .order("due_date");
  fail(error);
  return data ?? [];
}
/** Ajoute le rappel et renvoie son identifiant (pour la notification de création). */
export async function addReminder(r: { pet_id: string | null; pet_label: string; title: string; kind: string; due_date: string; remind_hour: number | null }): Promise<string> {
  const { data, error } = await supabase.from("pet_reminders").insert({ ...r, time_zone: browserTimeZone() }).select("id").single();
  fail(error);
  return data!.id;
}
export async function setReminderDone(id: string, done: boolean) {
  fail((await supabase.from("pet_reminders").update({ done }).eq("id", id)).error);
}
export async function deleteReminder(id: string) {
  fail((await supabase.from("pet_reminders").delete().eq("id", id)).error);
}

/** Photo de profil : envoyée dans l’espace privé de la personne, lien signé valable un an. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  fail((await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type })).error);
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
  fail(error);
  return data!.signedUrl;
}

/* ---------- Carnet : notes datées prises pendant les formations ---------- */
export async function listNotes(): Promise<CourseNote[]> {
  const { data, error } = await supabase.from("course_notes").select("id, course_id, course_title, body, created_at, updated_at").order("created_at", { ascending: false }).limit(500);
  fail(error);
  return data ?? [];
}
export async function addNote(n: { course_id: string; course_title: string; body: string }) {
  fail((await supabase.from("course_notes").insert({ ...n, body: n.body.slice(0, 5000) })).error);
}
export async function updateNote(id: string, body: string) {
  fail((await supabase.from("course_notes").update({ body: body.slice(0, 5000) }).eq("id", id)).error);
}
export async function deleteNote(id: string) {
  fail((await supabase.from("course_notes").delete().eq("id", id)).error);
}

/* ---------- Objectifs ---------- */
export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase.from("goals").select("*").order("created_at");
  fail(error);
  return (data ?? []).map((g) => ({ ...g, kind: g.kind as GoalKind, period: g.period as GoalPeriod }));
}
export async function addGoal(g: { kind: GoalKind; target: number; period: GoalPeriod; remind_hour: number }) {
  fail((await supabase.from("goals").insert({ ...g, time_zone: browserTimeZone() })).error);
}
export async function markGoalAchieved(id: string) {
  fail((await supabase.from("goals").update({ achieved_at: new Date().toISOString() }).eq("id", id)).error);
}
export async function deleteGoal(id: string) {
  fail((await supabase.from("goals").delete().eq("id", id)).error);
}
