import { useEffect, useState, type ReactNode } from "react";
import { EyeOff } from "lucide-react";

/**
 * Protège un quiz ou un examen : pas de copier, pas de clic droit, pas d’impression,
 * et le contenu se masque dès que la page perd le focus ou qu’une capture est tentée.
 * Un site web ne peut pas bloquer à 100 % une capture d’écran du téléphone ou de l’ordinateur.
 */
export function QuizGuard({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const hide = () => setHidden(true);
    const onVis = () => document.visibilityState === "hidden" && hide();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const shot = k === "printscreen" || (e.metaKey && e.shiftKey && ["3", "4", "5", "s"].includes(k)) || ((e.ctrlKey || e.metaKey) && ["p", "c", "s", "u"].includes(k));
      if (shot) {
        e.preventDefault();
        hide();
        navigator.clipboard?.writeText("").catch(() => {});
      }
    };
    window.addEventListener("blur", hide);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("blur", hide);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, []);

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div className="quiz-guard relative" onCopy={block} onCut={block} onContextMenu={block} onDragStart={block}>
      <div className={hidden ? "pointer-events-none select-none blur-xl" : "select-none"} aria-hidden={hidden}>
        {children}
      </div>
      {hidden ? (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-16">
          <div className="sticky top-28 max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <EyeOff className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="mt-3 font-bold text-foreground">Quiz masqué</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les captures d’écran, la copie et l’impression des questions ne sont pas autorisées. Vos réponses sont gardées.
            </p>
            <button type="button" onClick={() => setHidden(false)} className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Reprendre le quiz
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
