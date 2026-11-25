import { useMemo, useState } from "react";
import { ArrowRight, Check, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feedbackComplete, feedbackQuestions, type FeedbackAnswers } from "@/lib/formations/feedback";
import type { Course } from "@/lib/formations/types";
import { saveCourseFeedback } from "@/lib/account-data";
import { useServerFn } from "@tanstack/react-start";
import { emailCourseFeedback } from "@/lib/feedback.functions";
import { cn } from "@/lib/utils";

/** Mot de remerciement + avis en 10 questions Oui / Non, à remplir avant l’examen final. */
export function CourseFeedback({ course, uid, onDone }: { course: Course; uid: string; onDone: () => void }) {
  const questions = useMemo(() => feedbackQuestions(course), [course]);
  const [answers, setAnswers] = useState<FeedbackAnswers>({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailFeedback = useServerFn(emailCourseFeedback);
  const answered = questions.filter((x) => typeof answers[x.id] === "boolean").length;
  const complete = feedbackComplete(questions, answers);

  const submit = async () => {
    if (!complete) return;
    setBusy(true);
    setError("");
    try {
      await saveCourseFeedback(uid, course.id, answers, comment);
      // Envoi du PDF au responsable en arrière-plan : l’apprenant passe directement à l’examen.
      void emailFeedback({ data: { courseId: course.id } }).catch((e) => console.error("Feedback email failed", e));
      onDone();
    } catch {
      setError("Votre avis n’a pas pu être enregistré. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="fb-title" className="space-y-5">
      <div className="rounded-2xl border border-primary/25 bg-success-soft p-5">
        <p className="flex items-center gap-2 text-lg font-bold text-accent-foreground">
          <Heart className="size-5 fill-current" aria-hidden="true" /> Merci d’avoir suivi cette formation jusqu’au bout !
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground">
          Vous avez terminé tous les chapitres de « {course.title} ». Bravo pour votre travail : prendre soin des animaux commence par
          bien les connaître.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground">
          Avant l’examen final, donnez-nous votre avis. Vos réponses sont importantes : elles nous aident à améliorer les formations
          (langues, vidéos, photos, difficulté). Répondez par <b>Oui</b> ou <b>Non</b> aux {questions.length} questions, cela prend une minute.
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h3 id="fb-title" className="font-display text-2xl text-foreground">Votre avis sur la formation</h3>
        <span className="shrink-0 text-sm font-semibold text-muted-foreground" aria-live="polite">{answered} / {questions.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
      </div>

      <ol className="space-y-3">
        {questions.map((x, i) => {
          const v = answers[x.id];
          return (
            <li key={x.id} className="rounded-2xl border border-border bg-card p-4">
              <p id={`fb-${x.id}`} className="text-[15px] font-semibold text-foreground">
                <span className="text-muted-foreground">{i + 1}. </span>{x.q}
              </p>
              <div role="radiogroup" aria-labelledby={`fb-${x.id}`} className="mt-3 flex gap-2">
                {([true, false] as const).map((yes) => (
                  <button
                    key={String(yes)}
                    type="button"
                    role="radio"
                    aria-checked={v === yes}
                    onClick={() => setAnswers((a) => ({ ...a, [x.id]: yes }))}
                    className={cn(
                      "inline-flex h-10 min-w-24 items-center justify-center gap-1.5 rounded-full border px-5 text-sm font-bold transition-colors",
                      v === yes ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    {yes ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                    {yes ? "Oui" : "Non"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <label className="block">
        <span className="text-[15px] font-semibold text-foreground">Que devrions-nous améliorer ? <span className="font-normal text-muted-foreground">(facultatif)</span></span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Ex. : plus de vidéos, une version en lingala…"
          className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {error ? <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="brand" className="h-12 rounded-full px-7" disabled={!complete || busy} onClick={submit}>
          {busy ? "Envoi…" : "Passer à l’examen final"} <ArrowRight />
        </Button>
        {!complete ? <span className="text-sm text-muted-foreground">Répondez aux {questions.length} questions pour continuer.</span> : null}
      </div>
    </section>
  );
}
