import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, BookOpen, ChevronLeft, ChevronRight, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { Course } from "@/lib/formations";
import { courseCover } from "@/lib/formations/covers";
import type { CourseStatus } from "@/lib/formations/grading";
import { cn } from "@/lib/utils";

export type CourseEntry = { c: Course; s: CourseStatus; favorite: boolean };

/** Étape où reprendre une formation (intro, prochain chapitre ou examen). */
export const resumeStep = (c: Course, s: CourseStatus) =>
  s.started ? (s.examUnlocked ? "exam" : (c.chapters[s.chaptersDone]?.id ?? "intro")) : "intro";

export function CourseCard({ c, s, favorite }: CourseEntry) {
  return (
    <Link
      to="/formations/$courseId"
      params={{ courseId: c.id }}
      search={{ step: resumeStep(c, s) }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-soft-card focus-visible:outline-2 focus-visible:outline-primary"
    >
      <div className="relative aspect-[2/1] overflow-hidden bg-muted sm:aspect-[16/9]">
        <img
          src={courseCover(c.id)}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-md bg-card/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-foreground">
            {c.level}
          </span>
          {s.passed ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-award-soft px-2 py-0.5 text-[11px] font-bold text-award-foreground">
              <Award className="size-3" /> Brevet
            </span>
          ) : null}
        </div>
        {favorite ? (
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-card/90">
            <Heart className="size-4 fill-current text-destructive" aria-label="Favori" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{c.species}</p>
        <p className="mt-1.5 line-clamp-2 text-lg font-bold leading-snug text-foreground">
          {c.title}
        </p>
        <div className="mt-2 flex-1">
          <p className="line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
        </div>
        <div className="mt-4 flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" /> {c.hours} h
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="size-4" /> {c.chapters.length} chapitres
          </span>
        </div>
        {s.started ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${s.percent}%` }} />
            </div>
            <span className="text-xs font-bold text-primary">{s.percent} %</span>
          </div>
        ) : null}
        <span className="mt-4 inline-flex items-center gap-1 border-t border-border pt-4 text-sm font-bold text-primary">
          {s.passed ? "Revoir la formation" : s.started ? "Continuer" : "Commencer"}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

/** Une rangée de formations qui défile : une carte à la fois sur téléphone, flèches Précédent / Suivant. */
export function CourseCarousel({
  title,
  sub,
  items,
  action,
  hideTitle = false,
}: {
  title: string;
  /** Titre lu par les lecteurs d’écran seulement. */
  hideTitle?: boolean;
  sub?: string | undefined;
  items: CourseEntry[];
  /** Lien affiché à côté du titre (ex. « Voir tout »). */
  action?: ReactNode;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [snaps, setSnaps] = useState(1);

  const sync = useCallback((a: CarouselApi) => {
    if (!a) return;
    setIndex(a.selectedScrollSnap());
    setSnaps(a.scrollSnapList().length);
  }, []);

  useEffect(() => {
    if (!api) return;
    sync(api);
    api.on("select", sync).on("reInit", sync);
    return () => {
      api.off("select", sync).off("reInit", sync);
    };
  }, [api, sync]);

  const canPrev = index > 0;
  const canNext = index < snaps - 1;

  return (
    <section aria-label={title} className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className={cn("font-display text-2xl leading-tight text-foreground sm:text-[28px]", hideTitle && "sr-only")}>
              {title}
            </h3>
            {action}
          </div>
          {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="iconSoft"
            size="iconRound"
            aria-label="Formations précédentes"
            disabled={!canPrev}
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="iconSoft"
            size="iconRound"
            aria-label="Formations suivantes"
            disabled={!canNext}
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Carousel setApi={setApi} opts={{ align: "start", slidesToScroll: "auto" }}>
        <CarouselContent className="-ml-4">
          {items.map((e) => (
            <CarouselItem key={e.c.id} className="basis-full pl-4 sm:basis-1/2 xl:basis-1/3">
              <CourseCard {...e} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Téléphone : une formation à la fois, navigation en bas. */}
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <Button
          variant="soft"
          className="rounded-full"
          disabled={!canPrev}
          onClick={() => api?.scrollPrev()}
        >
          <ChevronLeft /> Précédent
        </Button>
        <Button
          variant="soft"
          className="rounded-full"
          disabled={!canNext}
          onClick={() => api?.scrollNext()}
        >
          Suivant <ChevronRight />
        </Button>
      </div>

      {snaps > 1 ? (
        <div className="hidden justify-center gap-1.5 sm:flex" aria-hidden>
          {Array.from({ length: snaps }, (_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
