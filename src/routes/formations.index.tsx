import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Filter, LayoutGrid, Search, UserRound, X } from "lucide-react";
import { Brand } from "@/components/auth/brand";
import { ThemeMenu } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCard, CourseCarousel, type CourseEntry } from "@/components/formations/course-carousel";
import { supabase } from "@/integrations/supabase/client";
import { listExams, listProgress } from "@/lib/account-data";
import { COURSES } from "@/lib/formations";
import { courseCover } from "@/lib/formations/covers";
import { courseStatus, type ChapterScores, type ExamResult } from "@/lib/formations/grading";
import { DURATIONS, SUBJECTS, subjectOf, type DurationId, type SubjectId } from "@/lib/formations/subjects";
import type { CourseLevel } from "@/lib/formations/types";
import { cn } from "@/lib/utils";
import { LegalLinks } from "@/components/legal/legal-links";

const TITLE = "Catalogue des formations – VetoCare";
const DESC = "Toutes les formations gratuites VetoCare en santé animale : animaux de compagnie, élevage, prévention et métiers vétérinaires.";

export const Route = createFileRoute("/formations/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "icon", href: "/site/assets/favicon.svg" }],
  }),
  component: CatalogPage,
});

const LEVELS: CourseLevel[] = ["Débutant", "Intermédiaire", "Avancé"];
const FEATURED = "auxiliaire-veterinaire";

/** Progression de la personne si elle est connectée ; sinon toutes les formations « à commencer ». */
function useEntries() {
  const [scores, setScores] = useState<Record<string, ChapterScores>>({});
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [fav, setFav] = useState<Record<string, boolean>>({});
  const [read, setRead] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const [p, e] = await Promise.all([listProgress(), listExams()]);
        if (!active) return;
        setScores(Object.fromEntries(p.map((r) => [r.course_id, r.chapter_scores])));
        setFav(Object.fromEntries(p.map((r) => [r.course_id, r.favorite])));
        setRead(Object.fromEntries(p.map((r) => [r.course_id, r.read_sections])));
        setExams(e);
      } catch {
        /* catalogue affiché sans progression */
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return useMemo<CourseEntry[]>(
    () => COURSES.map((c) => ({ c, s: courseStatus(c, scores[c.id], exams, read[c.id]), favorite: !!fav[c.id] })),
    [scores, exams, fav, read],
  );
}

function CatalogPage() {
  const entries = useEntries();
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [durations, setDurations] = useState<DurationId[]>([]);
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = q.trim().toLowerCase();
  const filtering = !!subject || levels.length > 0 || durations.length > 0 || !!query;
  const results = entries.filter(({ c }) =>
    (!subject || subjectOf(c.id) === subject) &&
    (!levels.length || levels.includes(c.level)) &&
    (!durations.length || DURATIONS.some((d) => durations.includes(d.id) && d.test(c.hours))) &&
    (!query || `${c.title} ${c.species} ${c.summary}`.toLowerCase().includes(query)),
  );
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clear = () => {
    setSubject(null);
    setLevels([]);
    setDurations([]);
    setQ("");
  };
  const pick = (id: SubjectId | null) => {
    setSubject(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const featured = COURSES.find((c) => c.id === FEATURED)!;

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-foreground">Niveau</p>
        <div className="mt-3 space-y-2.5">
          {LEVELS.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-3 text-[15px] text-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={levels.includes(l)} onChange={() => setLevels((v) => toggle(v, l))} />
              {l}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">Durée</p>
        <div className="mt-3 space-y-2.5">
          {DURATIONS.map((d) => (
            <label key={d.id} className="flex cursor-pointer items-center gap-3 text-[15px] text-foreground">
              <input type="checkbox" className="size-4 accent-primary" checked={durations.includes(d.id)} onChange={() => setDurations((v) => toggle(v, d.id))} />
              {d.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div lang="fr" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-header-glass backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <a href="/site/index.html" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary sm:inline-flex">
              <ArrowLeft className="size-4" aria-hidden="true" /> Retour au site
            </a>
            <Button asChild variant="soft" className="rounded-full">
              <Link to="/mon-compte"><UserRound /> <span className="hidden sm:inline">Mon compte</span></Link>
            </Button>
            <ThemeMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <nav aria-label="Fil d’Ariane" className="text-sm text-muted-foreground">
          <Link to="/mon-compte" className="hover:text-primary">Mon compte</Link> <span aria-hidden>/</span>{" "}
          <span className="text-foreground">Catalogue</span>
        </nav>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h1 className="font-display text-4xl font-normal leading-tight sm:text-5xl">Catalogue des formations</h1>
          <label className="relative w-full md:w-80">
            <span className="sr-only">Rechercher une formation</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une formation…" className="h-11 rounded-full pl-10" />
          </label>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* Colonne de gauche : sujets + filtres (ordinateur). */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <div>
                <p className="flex items-center gap-2.5 border-b border-border pb-4 font-display text-2xl"><LayoutGrid className="size-5" /> Sujets</p>
                <ul className="mt-3 space-y-1">
                  {SUBJECTS.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => pick(subject === s.id ? null : s.id)}
                        className={cn("w-full rounded-lg px-3 py-2 text-left text-[15px] transition-colors",
                          subject === s.id ? "bg-nav-active font-bold text-primary" : "text-foreground hover:bg-muted")}>
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <p className="flex items-center gap-2.5 font-display text-2xl"><Filter className="size-5" /> Filtres</p>
                  {filtering ? <button type="button" onClick={clear} className="text-sm font-semibold text-primary hover:underline">Tout effacer</button> : null}
                </div>
                <div className="mt-5">{filterPanel}</div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-10">
            {/* Téléphone : sujets en pastilles, filtres repliables. */}
            <div className="space-y-3 lg:hidden">
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                {[{ id: null, label: "Tous les sujets" } as const, ...SUBJECTS].map((s) => (
                  <button key={s.id ?? "all"} type="button" onClick={() => setSubject(s.id)}
                    className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                      subject === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold">
                <span className="inline-flex items-center gap-2"><Filter className="size-4" /> Filtres{levels.length + durations.length ? ` (${levels.length + durations.length})` : ""}</span>
                <ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} />
              </button>
              {filtersOpen ? <div className="rounded-2xl border border-border bg-card p-4">{filterPanel}</div> : null}
            </div>

            {filtering ? (
              <section aria-live="polite" className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-3xl font-normal">
                    {subject ? SUBJECTS.find((s) => s.id === subject)?.label : "Résultats"}
                  </h2>
                  <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    <X className="size-4" /> Effacer les filtres
                  </button>
                </div>
                {results.length ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((e) => <CourseCard key={e.c.id} {...e} />)}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Aucune formation ne correspond. Essayez un autre filtre.</p>
                )}
              </section>
            ) : (
              <>
                {/* Formation à la une. */}
                <Link to="/formations/$courseId" params={{ courseId: featured.id }} search={{ step: "intro" }}
                  className="group grid overflow-hidden rounded-2xl bg-muted sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
                  <img src={courseCover(featured.id)} alt="" className="h-44 w-full object-cover sm:h-full" />
                  <div className="p-5 sm:p-7">
                    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Parcours professionnel · {featured.hours} h</p>
                    <p className="mt-2 text-xl font-bold text-foreground">{featured.title}</p>
                    <p className="mt-2 line-clamp-2 text-[15px] text-muted-foreground">{featured.summary}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 group-hover:underline">
                      En savoir plus <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>

                <h2 className="font-display text-3xl font-normal sm:text-4xl">Explorer le catalogue</h2>
                {SUBJECTS.map((s) => (
                  <CourseCarousel
                    key={s.id}
                    title={s.label}
                    sub={s.sub}
                    items={entries.filter((e) => subjectOf(e.c.id) === s.id)}
                    action={
                      <button type="button" onClick={() => pick(s.id)} className="border-l border-border pl-4 text-[15px] font-semibold text-primary hover:underline">
                        Voir tout
                      </button>
                    }
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
      <footer className="border-t border-border px-4 py-6">
        <LegalLinks />
      </footer>
    </div>
  );
}
