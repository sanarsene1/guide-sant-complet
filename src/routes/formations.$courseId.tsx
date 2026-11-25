import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuizGuard } from "@/components/formations/quiz-guard";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronDown, Clock, Download, Heart, Lock, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteFab } from "@/components/formations/note-fab";
import { CourseFeedback } from "@/components/formations/course-feedback";
import { CertificateCard } from "@/components/formations/certificate-card";
import { feedbackRequired } from "@/lib/formations/feedback";
import { Brand } from "@/components/auth/brand";
import { QuizRunner } from "@/components/account/quiz-runner";
import { ChapterVideoPlayer } from "@/components/formations/chapter-video";
import { courseById } from "@/lib/formations";
import { stepImage } from "@/lib/formations/images";
import {
  chapterPassed,
  chapterUnlocked,
  courseStatus,
  drawExam,
  resumeStep,
  EXAM_QUESTIONS,
  quizPercent,
  examPassed,
  mention,
  noteOn20,
  EXAM_PASS_NOTE,
  durationLabel,
  chapterRead,
  type ChapterScores,
  type ExamResult,
} from "@/lib/formations/grading";
import { buildCertificatePdf, certificatePdfName } from "@/lib/formations/pdf";
import { LegalLinks } from "@/components/legal/legal-links";
import { getCourseFeedback, listExams, listProgress, saveChapterScore, saveCourseMeta, saveExam, saveReadSections, type ReadSections } from "@/lib/account-data";
import { accountSummary } from "@/lib/auth-helpers";
import { downloadBlob } from "@/lib/quiz-pdf";
import { useAccountSession } from "@/lib/use-account-session";
import { cn } from "@/lib/utils";

type Search = { step?: string };

export const Route = createFileRoute("/formations/$courseId")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => (typeof s["step"] === "string" ? { step: s["step"] } : {}),
  loader: ({ params }) => {
    const course = courseById(params.courseId);
    if (!course) throw notFound();
    return { title: course.title, summary: course.summary };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Formation"} – Formations VetoCare` },
      { name: "description", content: loaderData?.summary ?? "Formation VetoCare en santé animale." },
      { property: "og:title", content: `${loaderData?.title ?? "Formation"} – VetoCare` },
      { property: "og:description", content: loaderData?.summary ?? "Formation VetoCare en santé animale." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "icon", href: "/site/assets/favicon.svg" }],
  }),
  component: CoursePage,
});

type Phase = "read" | "recap" | "quiz";

function CoursePage() {
  const { courseId } = Route.useParams();
  const { step: stepParam } = Route.useSearch();
  const step = stepParam ?? "intro";
  const navigate = Route.useNavigate();
  const course = courseById(courseId)!;
  const { session, ready } = useAccountSession();
  const [scores, setScores] = useState<ChapterScores>({});
  const [readMap, setReadMap] = useState<ReadSections>({});
  const [page, setPage] = useState(0);
  const [maxPage, setMaxPage] = useState(0);
  const [introPage, setIntroPage] = useState(0);
  const [phase, setPhase] = useState<Phase>("read");
  const [stepsOpen, setStepsOpen] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [savedNotes, setSavedNotes] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [examAttempt, setExamAttempt] = useState(0);
  const [result, setResult] = useState<{ kind: "chapter" | "exam"; score: number; total: number; exam?: ExamResult } | null>(null);
  const uid = session?.user.id ?? "";

  const chapter = course.chapters.find((c) => c.id === step);
  // Une page = un paragraphe : peu de texte à la fois.
  const pages = useMemo(
    () => (chapter ? chapter.sections.flatMap((sec, s) => sec.p.map((p, k) => ({ s, k, h: sec.h, p, last: k === sec.p.length - 1 }))) : []),
    [chapter],
  );
  const firstPageOf = (s: number) => Math.max(0, pages.findIndex((x) => x.s === s));

  useEffect(() => {
    if (!ready) return;
    Promise.all([listProgress(), listExams(), getCourseFeedback(course.id).catch(() => null)])
      .then(([p, e, fb]) => {
        setFeedbackGiven(!!fb);
        const row = p.find((r) => r.course_id === course.id);
        setScores(row?.chapter_scores ?? {});
        setReadMap(row?.read_sections ?? {});
        setFavorite(row?.favorite ?? false);
        setSavedNotes(row?.notes ?? "");
        setExams(e.filter((x) => x.course_id === course.id));
      })
      .catch(() => setError("Impossible de charger votre progression. Rechargez la page."))
      .finally(() => setLoaded(true));
  }, [ready, course.id]);

  useEffect(() => {
    setResult(null);
    setStepsOpen(false);
    setIntroPage(0);
    if (chapter) {
      const read = readMap[chapter.id] ?? 0;
      const passed = chapterPassed(scores[chapter.id]);
      const fully = chapterRead(chapter.sections.length, read);
      const start = passed || fully ? 0 : firstPageOf(read);
      setPage(start);
      setMaxPage(passed || fully ? pages.length - 1 : start);
      setPhase(fully && !passed ? "recap" : "read");
    } else {
      setPhase("recap");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sans étape dans l’adresse : on reprend la formation là où le visiteur s’est arrêté.
  useEffect(() => {
    if (loaded && !stepParam) navigate({ search: { step: resumeStep(course, scores, readMap) }, replace: true });
  }, [loaded, stepParam]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le bouton « Suivant » s’active seulement quand le bas de la page a été atteint.
  useEffect(() => {
    setReachedEnd(false);
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setReachedEnd(true), { threshold: 1 });
    io.observe(el);
    return () => io.disconnect();
  }, [step, page, phase, loaded]);

  // Nouvel examen tiré au sort à chaque essai.
  const examQuestions = useMemo(() => drawExam(course), [course, examAttempt]);

  if (!ready || !loaded || !session) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Chargement de la formation…</div>;
  }

  const status = courseStatus(course, scores, exams, readMap);
  const steps = ["intro", ...course.chapters.map((c) => c.id), "exam"];
  const idx = Math.max(0, steps.indexOf(step));
  const go = (s: string) => navigate({ search: { step: s } });
  const who = accountSummary(session.user).name;
  const isLocked = (s: string) => (s === "exam" ? !status.examUnlocked : course.chapters.some((c) => c.id === s) && !chapterUnlocked(course, scores, s));
  const resume = resumeStep(course, scores, readMap);
  const stepLabel = (s: string) => (s === "intro" ? "Introduction" : s === "exam" ? "Examen final" : course.chapters.find((c) => c.id === s)?.title ?? "");
  const askFeedback = feedbackRequired(feedbackGiven, status.passed);
  const continueLabel = status.started ? "Continuer la formation" : "Commencer la formation";

  const readCount = chapter ? (chapterPassed(scores[chapter.id]) ? chapter.sections.length : readMap[chapter.id] ?? 0) : 0;

  /** Premier clic sur « Commencer » : la formation est marquée commencée, puis chapitre 1. */
  const startCourse = async () => {
    if (status.started) return go(resume);
    const first = course.chapters[0]!.id;
    try {
      setReadMap(await saveReadSections(uid, course.id, scores, readMap, first, 0));
    } catch {
      /* la lecture reste possible ; la progression s’enregistrera à la première page lue */
    }
    go(first);
  };

  const nextPage = async () => {
    if (!chapter) return;
    const cur = pages[page]!;
    if (cur.last && cur.s + 1 > readCount) {
      try {
        setReadMap(await saveReadSections(uid, course.id, scores, readMap, chapter.id, cur.s + 1));
      } catch {
        setError("Votre lecture n’a pas pu être enregistrée. Vérifiez votre connexion.");
        return;
      }
    }
    if (page < pages.length - 1) {
      setPage(page + 1);
      setMaxPage((m) => Math.max(m, page + 1));
    } else {
      setPhase("recap");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onChapterQuiz = async (score: number) => {
    if (!chapter) return;
    setBusy(true);
    setError("");
    try {
      setScores(await saveChapterScore(uid, course.id, scores, chapter.id, score, chapter.quiz.length));
      setResult({ kind: "chapter", score, total: chapter.quiz.length });
    } catch {
      setError("Votre score n’a pas pu être enregistré. Vérifiez votre connexion.");
    } finally {
      setBusy(false);
    }
  };

  const onExam = async (answers: (number | null)[], score: number) => {
    setBusy(true);
    setError("");
    const total = examQuestions.length;
    const note = noteOn20(score, total);
    try {
      const saved = await saveExam({ course_id: course.id, score, total, note, passed: examPassed(note), answers });
      setExams((e) => [saved, ...e]);
      setResult({ kind: "exam", score, total, exam: saved });
    } catch {
      setError("Votre examen n’a pas pu être enregistré. Vérifiez votre connexion.");
    } finally {
      setBusy(false);
    }
  };

  const retry = (kind: "chapter" | "exam") => {
    setResult(null);
    if (kind === "chapter") setAttempt((n) => n + 1);
    else setExamAttempt((n) => n + 1);
    setPhase("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    try {
      await saveCourseMeta(uid, course.id, scores, { favorite: next, notes: savedNotes });
    } catch {
      setFavorite(!next);
    }
  };

  const introPages: { title: string; body: React.ReactNode }[] = [
    ...course.introduction.map((p, i) => ({
      title: i === 0 ? "Bienvenue" : "Introduction",
      body: <p className="text-[17px] leading-relaxed text-foreground">{p}</p>,
    })),
    {
      title: "À la fin, vous saurez",
      body: (
        <ul className="space-y-3">
          {course.objectives.map((o) => (
            <li key={o} className="flex gap-2 text-[16px] text-foreground"><Check className="mt-1 size-4 shrink-0 text-primary" />{o}</li>
          ))}
        </ul>
      ),
    },
    {
      title: "Pour qui ?",
      body: (
        <div className="space-y-4">
          <p className="text-[16px] leading-relaxed text-foreground">{course.audience}</p>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="font-bold text-foreground">Prérequis</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-foreground">{(course.prerequisites.length ? course.prerequisites : ["Aucun prérequis"]).map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </div>
      ),
    },
    {
      title: "Plan du cours",
      body: (
        <ol className="space-y-3">
          {course.chapters.map((c, i) => (
            <li key={c.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-soft text-sm font-bold text-accent-foreground">{i + 1}</span>
              <span>
                <span className="block font-semibold text-foreground">{c.title}</span>
                <span className="text-sm text-muted-foreground">{c.minutes >= 120 ? `${Math.round(c.minutes / 60)} h` : `${c.minutes} min`} · quiz de {c.quiz.length} questions</span>
              </span>
            </li>
          ))}
          <li className="flex gap-3 rounded-xl border border-award/30 bg-award-soft p-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-award-foreground"><Award className="size-4" /></span>
            <span>
              <span className="block font-semibold text-foreground">Examen final</span>
              <span className="text-sm text-muted-foreground">{EXAM_QUESTIONS} questions · brevet dès {EXAM_PASS_NOTE}/20</span>
            </span>
          </li>
        </ol>
      ),
    },
    {
      title: "Comment ça marche",
      body: (
        <ol className="list-decimal space-y-2 pl-5 text-[16px] leading-relaxed text-foreground">
          <li>Lisez page par page ; les chapitres s’ouvrent dans l’ordre.</li>
          <li>Chaque chapitre finit par un quiz : il faut 70 % pour continuer.</li>
          <li>Pas réussi ? Refaites le quiz, les réponses sont mélangées.</li>
          <li>L’examen final donne le brevet dès {EXAM_PASS_NOTE}/20.</li>
          <li>Votre progression est gardée : reprenez quand vous voulez.</li>
        </ol>
      ),
    },
  ];

  return (
    <div lang="fr" className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Brand />
          <Link to="/mon-compte" search={{ tab: "formations" }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Mes formations
          </Link>
        </div>
        {step !== "intro" ? (
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pb-2.5">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{course.title}</p>
            <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted sm:w-32" aria-hidden="true">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${status.percent}%` }} />
            </div>
            <span className="shrink-0 text-xs font-bold text-primary">{status.percent} %</span>
          </div>
        ) : null}
      </header>

      {step === "intro" ? (
        <div className="bg-account-hero text-photo-foreground">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-photo-accent">{course.species} · {course.level}</p>
            <h1 className="mt-2 max-w-3xl font-display text-2xl leading-tight sm:text-[42px]">{course.title}</h1>
            <p className="mt-3 max-w-2xl text-photo-muted">{course.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-photo-muted">
              <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {durationLabel(course.hours)}</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4" /> {course.chapters.length} chapitres + examen</span>
              <span className="inline-flex items-center gap-1.5"><Award className="size-4" /> Brevet dès {EXAM_PASS_NOTE}/20</span>
            </div>
            {status.started ? (
              <>
                <div className="mt-5 h-2 max-w-md overflow-hidden rounded-full bg-photo-foreground/20">
                  <div className="h-full rounded-full bg-photo-accent transition-all" style={{ width: `${status.percent}%` }} />
                </div>
                <p className="mt-2 text-sm text-photo-muted">{status.percent} % terminé</p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-5 py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm lg:hidden"
            aria-expanded={stepsOpen}
            onClick={() => setStepsOpen((o) => !o)}
          >
            <span className="min-w-0 truncate"><b className="text-foreground">Étape {idx + 1} / {steps.length}</b> <span className="text-muted-foreground">· {stepLabel(step)}</span></span>
            <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", stepsOpen && "rotate-180")} />
          </button>
          <div className={cn("mt-3 space-y-5 lg:mt-0 lg:block", stepsOpen ? "block" : "hidden")}>
            <nav aria-label="Étapes de la formation" className="rounded-2xl border border-border bg-card p-2">
              {steps.map((s, i) => {
                const ch = course.chapters.find((c) => c.id === s);
                const done = s === "intro" ? status.started : ch ? chapterPassed(scores[s]) : status.passed;
                const locked = isLocked(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={locked}
                    title={locked ? "Terminez d’abord l’étape précédente" : undefined}
                    onClick={() => go(s)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                      s === step ? "bg-success-soft font-bold text-accent-foreground" : locked ? "cursor-not-allowed text-muted-foreground opacity-60" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold", done ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground")}>
                      {done ? <Check className="size-3.5" /> : locked ? <Lock className="size-3.5" /> : i}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{stepLabel(s)}</span>
                    {ch?.video ? <PlayCircle className="size-4 shrink-0 text-muted-foreground" aria-label="Contient une vidéo" /> : null}
                  </button>
                );
              })}
            </nav>
            {resume !== step && !status.passed ? (
              <Button variant="brand" className="h-11 w-full rounded-full" onClick={startCourse}>
                {continueLabel} <ArrowRight />
              </Button>
            ) : null}
            <Button variant="soft" className="h-11 w-full rounded-full" onClick={toggleFavorite} aria-pressed={favorite}>
              <Heart className={cn(favorite && "fill-current text-destructive")} /> {favorite ? "Dans mes favoris" : "Ajouter aux favoris"}
            </Button>
          </div>
        </aside>

        <main className="min-w-0">
          {error ? <p role="alert" className="mb-5 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">{error}</p> : null}

          {step === "intro" || idx === 0 ? (() => {
            const ip = introPages[Math.min(introPage, introPages.length - 1)]!;
            const lastIntro = introPage >= introPages.length - 1;
            return (
              <article key={introPage} className="animate-rise space-y-5">
                <PageDots count={introPages.length} current={introPage} open={introPages.length - 1} onPick={setIntroPage} label="Page" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Introduction · {introPage + 1} / {introPages.length}</p>
                {introPage === 0 ? <StepPhoto src={stepImage(course.id, "intro")} alt={course.title} /> : null}
                <h2 className="font-display text-3xl text-foreground">{ip.title}</h2>
                {ip.body}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {introPage > 0 ? <Button variant="soft" className="rounded-full" onClick={() => setIntroPage(introPage - 1)}><ArrowLeft /> Précédent</Button> : null}
                  {!lastIntro ? (
                    <Button variant="brand" className="h-11 rounded-full px-6" onClick={() => { setIntroPage(introPage + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Suivant <ArrowRight /></Button>
                  ) : (
                    <Button variant="brand" className="h-12 rounded-full px-7" onClick={startCourse}>{continueLabel} <ArrowRight /></Button>
                  )}
                  {!lastIntro && status.started ? (
                    <Button variant="ghost" className="rounded-full" onClick={() => go(resume)}>Passer, {continueLabel.toLowerCase()}</Button>
                  ) : null}
                </div>
              </article>
            );
          })() : null}

          {chapter && isLocked(chapter.id) ? (
            <article className="animate-rise space-y-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Chapitre {idx}</p>
              <h2 className="font-display text-3xl leading-tight text-foreground">{chapter.title}</h2>
              <ResultBox ok={false} title="Chapitre verrouillé" text="Réussissez d’abord le quiz du chapitre précédent (70 %).">
                <Button variant="brand" className="rounded-full" onClick={() => go(resume)}>
                  Continuer la formation <ArrowRight />
                </Button>
              </ResultBox>
            </article>
          ) : null}

          {chapter && !isLocked(chapter.id) && phase === "read" && pages[page] ? (() => {
            const cur = pages[page]!;
            const frontier = page >= maxPage && cur.s >= readCount;
            const isLast = page === pages.length - 1;
            return (
              <article key={`${chapter.id}-${page}`} className="animate-rise space-y-5">
                <PageDots count={pages.length} current={page} open={maxPage} onPick={setPage} label="Page" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Chapitre {idx} · page {page + 1} / {pages.length}</p>
                {page === 0 ? (
                  <>
                    <StepPhoto src={stepImage(course.id, chapter.id)} alt={chapter.title} />
                    <h2 className="font-display text-3xl leading-tight text-foreground">{chapter.title}</h2>
                    <p className="text-[17px] leading-relaxed text-muted-foreground">{chapter.intro}</p>
                  </>
                ) : null}
                <section className="space-y-3">
                  {cur.k === 0 || page === 0 ? <h3 className="text-xl font-bold text-foreground">{cur.h}</h3> : <p className="text-sm font-semibold text-muted-foreground">{cur.h}</p>}
                  <p className="text-[17px] leading-relaxed text-foreground">{cur.p}</p>
                  {isLast && chapter.video ? <ChapterVideoPlayer video={chapter.video} /> : null}
                </section>
                <div ref={endRef} className="h-1" />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {page > 0 ? <Button variant="soft" className="rounded-full" onClick={() => setPage(page - 1)}><ArrowLeft /> Précédent</Button> : null}
                  <Button variant="brand" className="h-11 rounded-full px-6" disabled={frontier && !reachedEnd} onClick={nextPage}>
                    {isLast ? "J’ai fini le chapitre" : "Suivant"} <ArrowRight />
                  </Button>
                </div>
              </article>
            );
          })() : null}

          {chapter && !isLocked(chapter.id) && phase === "recap" ? (
            <article key={`${chapter.id}-recap`} className="animate-rise space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Chapitre {idx} · avant le quiz</p>
              <h2 className="font-display text-3xl leading-tight text-foreground">À retenir</h2>
              <ul className="space-y-3">
                {chapter.keyPoints.map((k) => (
                  <li key={k} className="flex gap-2 text-[16px] text-foreground"><Check className="mt-1 size-4 shrink-0 text-primary" />{k}</li>
                ))}
              </ul>
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="font-bold text-foreground">Quiz du chapitre · {chapter.quiz.length} questions</p>
                <p className="mt-1 text-[15px] text-muted-foreground">Une question à la fois. Il faut 70 % pour continuer.</p>
                {scores[chapter.id] ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dernier meilleur résultat : {quizPercent(scores[chapter.id]!.score, scores[chapter.id]!.total)} % {chapterPassed(scores[chapter.id]) ? "· réussi" : "· à refaire"}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="brand" className="h-11 rounded-full px-6" onClick={() => retry("chapter")}>Commencer le quiz <ArrowRight /></Button>
                  <Button variant="soft" className="rounded-full" onClick={() => { setPage(0); setPhase("read"); }}><BookOpen /> Relire le chapitre</Button>
                </div>
              </div>
            </article>
          ) : null}

          {chapter && !isLocked(chapter.id) && phase === "quiz" ? (
            <article className="animate-rise space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Chapitre {idx} · quiz</p>
              {result?.kind === "chapter" ? (() => {
                const pct = quizPercent(result.score, result.total);
                const ok = chapterPassed(result);
                const next = steps[idx + 1]!;
                return ok && next === "exam" && askFeedback ? (
                  <div className="space-y-6">
                    <ResultBox ok title={`Bravo, vous avez réussi ! ${pct} %`} text={`${result.score} bonnes réponses sur ${result.total}. C’était le dernier chapitre : plus qu’une étape avant l’examen final.`} />
                    <CourseFeedback course={course} uid={uid} onDone={() => { setFeedbackGiven(true); go("exam"); }} />
                  </div>
                ) : ok ? (
                  <ResultBox ok title={`Bravo, vous avez réussi ! ${pct} %`} text={`${result.score} bonnes réponses sur ${result.total}. Vous pouvez continuer la formation.`}>
                    <Button variant="brand" className="rounded-full" onClick={() => go(next)}>
                      {next === "exam" ? "Passer à l’examen final" : "Continuer la formation"} <ArrowRight />
                    </Button>
                  </ResultBox>
                ) : (
                  <ResultBox ok={false} title={`Pas encore réussi : ${pct} %`} text={`Il faut au moins 70 % pour continuer. Refaites le quiz pour continuer la formation.`}>
                    <Button variant="brand" className="rounded-full" onClick={() => retry("chapter")}><RotateCcw /> Refaire le quiz</Button>
                    <Button variant="soft" className="rounded-full" onClick={() => { setResult(null); setPage(0); setPhase("read"); }}><BookOpen /> Relire le chapitre</Button>
                  </ResultBox>
                );
              })() : (
                <QuizGuard><QuizRunner key={`${chapter.id}-${attempt}`} questions={chapter.quiz} busy={busy} onSubmit={(_a, s) => onChapterQuiz(s)} /></QuizGuard>
              )}
            </article>
          ) : null}

          {step === "exam" ? (
            <article className="animate-rise space-y-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Examen final</p>
              {!status.examUnlocked ? (
                <ResultBox ok={false} title="Examen verrouillé" text={`Réussissez d’abord les ${course.chapters.length} chapitres (${status.chaptersDone} / ${status.chaptersTotal} pour l’instant).`}>
                  <Button variant="brand" className="rounded-full" onClick={() => go(course.chapters.find((c) => !chapterPassed(scores[c.id]))?.id ?? "intro")}>
                    Continuer la formation <ArrowRight />
                  </Button>
                </ResultBox>
              ) : result?.kind === "exam" && result.exam ? (
                <ResultBox
                  ok={result.exam.passed}
                  title={result.exam.passed ? `Bravo, vous avez réussi ! ${quizPercent(result.score, result.total)} %` : `Pas encore réussi : ${quizPercent(result.score, result.total)} %`}
                  text={result.exam.passed
                    ? `Note ${String(result.exam.note).replace(".", ",")} / 20 · ${mention(result.exam.note)}. Votre brevet VetoCare est prêt.`
                    : `Note ${String(result.exam.note).replace(".", ",")} / 20. Il faut ${EXAM_PASS_NOTE}/20 (70 %) pour le brevet. Refaites l’examen.`}
                >
                  {result.exam.passed ? (
                    <>
                    <div className="w-full"><CertificateCard course={course} exam={result.exam} who={who} /></div>
                    <Button variant="brand" className="rounded-full" onClick={() => downloadBlob(buildCertificatePdf(course, result.exam!, who), certificatePdfName(course))}>
                      <Download /> Télécharger mon brevet
                    </Button>
                    </>
                  ) : (
                    <Button variant="brand" className="rounded-full" onClick={() => retry("exam")}><RotateCcw /> Refaire l’examen</Button>
                  )}
                </ResultBox>
              ) : askFeedback ? (
                <CourseFeedback course={course} uid={uid} onDone={() => { setFeedbackGiven(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              ) : phase === "quiz" ? (
                <QuizGuard><QuizRunner key={`exam-${examAttempt}`} questions={examQuestions} busy={busy} onSubmit={onExam} /></QuizGuard>
              ) : (
                <>
                  <h2 className="font-display text-3xl text-foreground">Prêt pour l’examen ?</h2>
                  <p className="text-[16px] leading-relaxed text-foreground">{examQuestions.length} questions, une à la fois. Il faut {EXAM_PASS_NOTE}/20 (70 %) pour le brevet.</p>
                  {status.bestExam ? (
                    <p className="text-sm text-muted-foreground">
                      Meilleure note : {String(status.bestExam.note).replace(".", ",")} / 20 · {mention(status.bestExam.note)}
                    </p>
                  ) : null}
                  <Button variant="brand" className="h-12 rounded-full px-7" onClick={() => retry("exam")}>Commencer l’examen <ArrowRight /></Button>
                </>
              )}
            </article>
          ) : null}
        </main>
      </div>
      <footer className="border-t border-border px-5 py-6">
        <LegalLinks />
      </footer>
      <NoteFab courseId={course.id} courseTitle={course.title} />
    </div>
  );
}

/** Petites barres de progression : une par page, cliquables jusqu’à la page la plus loin atteinte. */
function PageDots({ count, current, open, onPick, label }: { count: number; current: number; open: number; onPick: (i: number) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          disabled={i > open}
          onClick={() => onPick(i)}
          aria-label={`${label} ${i + 1}${i > open ? " (pas encore lue)" : ""}`}
          aria-current={i === current ? "step" : undefined}
          className={cn("h-1.5 flex-1 min-w-3 max-w-10 rounded-full transition-colors", i === current ? "bg-primary" : i < open || i < current ? "bg-primary/45" : "bg-muted", i > open && "cursor-not-allowed")}
        />
      ))}
    </div>
  );
}

function ResultBox({ ok, title, text, children }: { ok: boolean; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div role="status" className={cn("rounded-2xl border p-5", ok ? "border-primary/25 bg-success-soft" : "border-award/30 bg-warning-soft")}>
      <p className={cn("text-lg font-bold", ok ? "text-accent-foreground" : "text-award-foreground")}>{title}</p>
      <p className="mt-1 text-[15px] text-foreground">{text}</p>
      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

/** Photo d’illustration en tête de l’introduction et de chaque chapitre. */
function StepPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-muted">
      <img src={src} alt={alt} width={1200} height={800} loading="eager" decoding="async" className="aspect-[3/2] w-full object-cover" />
    </figure>
  );
}
