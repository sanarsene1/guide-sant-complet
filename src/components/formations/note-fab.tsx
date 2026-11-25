import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, NotebookPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote } from "@/lib/account-data";

/** Bouton flottant (en bas à droite) pour prendre une note : titre du cours + date + texte → Mon carnet. */
export function NoteFab({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const area = useRef<HTMLTextAreaElement>(null);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    if (open) area.current?.focus();
  }, [open]);

  const save = async () => {
    if (!body.trim()) return;
    setState("saving");
    try {
      await addNote({ course_id: courseId, course_title: courseTitle, body: body.trim() });
      setBody("");
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section role="dialog" aria-label="Prendre une note" className="w-[min(92vw,360px)] rounded-3xl border border-border bg-card p-4 shadow-float">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Mon carnet</p>
              <p className="mt-1 line-clamp-2 font-bold leading-snug text-foreground">{courseTitle}</p>
              <p className="text-xs capitalize text-muted-foreground">{today}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setOpen(false)}><X /></Button>
          </div>
          <Textarea
            ref={area}
            value={body}
            onChange={(e) => { setBody(e.target.value); if (state !== "saving") setState("idle"); }}
            maxLength={5000}
            rows={6}
            placeholder="Ce que je retiens de ce cours…"
            className="mt-3 bg-background"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {state === "saved" ? (
              <p className="flex items-center gap-1 text-sm font-semibold text-primary"><Check className="size-4" /> Ajoutée au <Link to="/mon-compte" search={{ tab: "carnet" }} className="underline">carnet</Link></p>
            ) : state === "error" ? (
              <p role="alert" className="text-sm text-destructive">Enregistrement impossible.</p>
            ) : (
              <span />
            )}
            <Button variant="brand" className="rounded-full" disabled={!body.trim() || state === "saving"} onClick={save}>
              {state === "saving" ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </section>
      ) : null}
      <button
        type="button"
        aria-label={open ? "Fermer le carnet" : "Prendre une note"}
        aria-expanded={open}
        onClick={() => { setOpen((v) => !v); setState("idle"); }}
        className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-float ring-4 ring-background transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <NotebookPen className="size-6" />}
      </button>
    </div>
  );
}
