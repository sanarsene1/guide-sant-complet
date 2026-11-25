import { useEffect, useState } from "react";
import { ArrowUp, Search } from "lucide-react";

const PHRASES = [
  "Mon chien tousse depuis trois jours…",
  "Ma chèvre ne mange plus depuis hier…",
  "Mon chat se gratte sans arrêt…",
  "Mes poules ont les plumes ébouriffées…",
  "Ma vache a de la fièvre et bave…",
];

function useTypewriter(phrases: string[]) {
  const [text, setText] = useState(phrases[0] ?? "");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    let n = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const p = phrases[i] ?? "";
      if (!deleting) {
        n += 1;
        setText(p.slice(0, n));
        if (n >= p.length) {
          deleting = true;
          timer = setTimeout(tick, 1800);
          return;
        }
        timer = setTimeout(tick, 55);
      } else {
        n -= 1;
        setText(p.slice(0, n));
        if (n <= 0) {
          deleting = false;
          i = (i + 1) % phrases.length;
          timer = setTimeout(tick, 350);
          return;
        }
        timer = setTimeout(tick, 22);
      }
    };
    n = 0;
    setText("");
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [phrases]);
  return text;
}

/** Right-hand photo panel of the account page, echoing the site's search by signs. */
export function AuthShowcase() {
  const text = useTypewriter(PHRASES);
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[28px] bg-deep">
      <img
        src="/site/assets/img/animal-companion-1600.webp"
        srcSet="/site/assets/img/animal-companion-1100.webp 1100w, /site/assets/img/animal-companion-1600.webp 1600w"
        sizes="50vw"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
      />
      <div className="absolute inset-0 bg-auth-overlay" />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-photo-foreground/25 bg-deep/40 px-3.5 py-1.5 text-[13px] font-semibold text-photo-muted backdrop-blur-sm">
          <Search className="size-3.5" aria-hidden="true" />
          Recherche par signes
        </p>

        <div className="mx-auto w-full max-w-[460px]">
          <div
            aria-hidden="true"
            className="flex items-center gap-3 rounded-2xl bg-card/95 py-3 pl-5 pr-3 shadow-float backdrop-blur"
          >
            <span className="min-h-6 flex-1 text-[15.5px] text-foreground">
              {text}
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-primary animate-caret" />
            </span>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <ArrowUp className="size-5" />
            </span>
          </div>
        </div>

        <div className="max-w-[440px]">
          <h2 className="font-display text-[34px] font-normal leading-[1.12] text-photo-foreground xl:text-[40px]">
            Comprendre ce qui rend votre animal <span className="text-photo-accent">malade</span>.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-photo-muted">
            Fiches maladies, conseils et quiz pour les animaux de compagnie et d’élevage.
          </p>
        </div>
      </div>
    </div>
  );
}
