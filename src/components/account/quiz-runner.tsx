import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseQuestion } from "@/lib/formations/types";
import { cn } from "@/lib/utils";

const shuffled = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

/** Temps pendant lequel la réponse choisie reste visible avant la question suivante. */
const NEXT_DELAY_MS = 450;

/**
 * Quiz à choix multiple, une question à la fois : choisir une réponse passe à la question suivante,
 * la dernière réponse envoie le quiz. Aucune correction n’est affichée ; la page montre le pourcentage.
 */
export function QuizRunner({
  questions,
  onSubmit,
  busy = false,
}: {
  questions: CourseQuestion[];
  onSubmit: (answers: (number | null)[], score: number) => void | Promise<void>;
  busy?: boolean;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [idx, setIdx] = useState(0);
  const [moving, setMoving] = useState(false);
  const [done, setDone] = useState(false);
  // Ordre des réponses mélangé à chaque essai ; les réponses gardent l’index d’origine.
  const [orders] = useState(() => questions.map((q) => shuffled(q.options.length)));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const q = questions[idx]!;
  const total = questions.length;

  const choose = (k: number) => {
    if (moving || done) return;
    const next = answers.map((v, j) => (j === idx ? k : v));
    setAnswers(next);
    setMoving(true);
    timer.current = setTimeout(() => {
      setMoving(false);
      if (idx < total - 1) {
        setIdx(idx + 1);
        return;
      }
      setDone(true);
      const score = questions.reduce((n, qq, i) => n + (next[i] === qq.correct ? 1 : 0), 0);
      void onSubmit(next, score);
    }, NEXT_DELAY_MS);
  };

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        {busy ? "Calcul de votre résultat…" : "Résultat prêt."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-foreground">Question {idx + 1} / {total}</span>
        <span className="text-muted-foreground">{total - idx - 1 > 0 ? `encore ${total - idx - 1}` : "dernière question"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>
      <fieldset key={idx} className="animate-rise rounded-2xl border border-border bg-card p-5">
        <legend className="sr-only">Question {idx + 1} sur {total}</legend>
        <p className="text-[17px] font-bold leading-snug text-foreground">{q.q}</p>
        <div className="mt-4 grid gap-2">
          {(orders[idx] ?? []).map((k, pos) => {
            const chosen = answers[idx] === k;
            return (
              <button
                key={k}
                type="button"
                disabled={moving}
                aria-pressed={chosen}
                onClick={() => choose(k)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
                  chosen ? "border-primary bg-success-soft font-semibold" : "border-input hover:border-primary",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold", chosen ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {"ABCDEF"[pos]}
                </span>
                {q.options[k]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {idx > 0 ? (
          <Button variant="soft" className="rounded-full" disabled={moving} onClick={() => setIdx(idx - 1)}>
            <ArrowLeft /> Question précédente
          </Button>
        ) : <span />}
        <span className="text-sm text-muted-foreground">Touchez une réponse pour passer à la suite.</span>
      </div>
    </div>
  );
}
