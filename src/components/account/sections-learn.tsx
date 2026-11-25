import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, Check, Flame, BookOpen, ChevronDown, Clock, LockOpen, Download, FileText, Heart, Lock, NotebookPen, Pencil, PlayCircle, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COURSES } from "@/lib/formations";
import { courseCover } from "@/lib/formations/covers";
import { CHAPTER_PASS_RATIO, EXAM_PASS_NOTE, courseStatus, mention, type ChapterScores } from "@/lib/formations/grading";
import { CourseCarousel, resumeStep, type CourseEntry } from "@/components/formations/course-carousel";
import { buildCertificatePdf, buildReportPdf, certificatePdfName } from "@/lib/formations/pdf";
import { CertificateCard } from "@/components/formations/certificate-card";
import { CERTIFICATE_DISCLAIMER } from "@/lib/legal";
import { computeBadges } from "@/lib/account-badges";
import { addGoal, deleteGoal, deleteNote, deleteQuizAttempt, updateNote } from "@/lib/account-data";
import { goalLink, goalProgress, goalTitle, type GoalKind, type GoalPeriod } from "@/lib/goals";
import { Textarea } from "@/components/ui/textarea";
import { PushOptIn } from "./push-optin";
import { formatDuration, formatPlayedAt, percentOf, quizNumber, quizStats, type QuizAttempt } from "@/lib/quiz-history";
import { buildQuizPdf, downloadBlob, quizPdfName } from "@/lib/quiz-pdf";
import { cn } from "@/lib/utils";
import { Bar, Empty, Panel, SectionTitle, Stat, frDate, frNote, type AccountData, type SectionProps } from "./shared";

const scoresOf = (d: AccountData): Record<string, ChapterScores> =>
  Object.fromEntries(Object.entries(d.progress).map(([k, v]) => [k, v.chapter_scores]));

function useStatuses(d: AccountData) {
  return useMemo(() => {
    const s = scoresOf(d);
    return COURSES.map((c) => ({ c, s: courseStatus(c, s[c.id], d.exams, d.progress[c.id]?.read_sections) }));
  }, [d]);
}

const QUIZ_URL = "/site/quiz.html";

/* ---------- 1. Aperçu ---------- */
function StatButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="brand" size="sm" className="h-9 w-full gap-1 rounded-full px-2 text-xs sm:w-auto sm:px-4 sm:text-[13px]" onClick={onClick}>
      <span className="truncate">{children}</span> <ArrowRight className="size-3.5 shrink-0" />
    </Button>
  );
}

export function Overview({ data, go }: SectionProps) {
  const statuses = useStatuses(data);
  const qs = quizStats(data.quizzes);
  const inProgress = statuses.filter((x) => x.s.started && !x.s.passed);
  const brevets = statuses.filter((x) => x.s.passed).length;
  const next = data.reminders.filter((r) => !r.done).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const resume = inProgress.sort((a, b) => (data.progress[b.c.id]?.updated_at ?? "").localeCompare(data.progress[a.c.id]?.updated_at ?? ""))[0];
  const earned = computeBadges({
    quizzes: data.quizzes,
    progress: scoresOf(data),
    exams: data.exams,
    pets: data.pets.length,
    remindersDone: data.reminders.filter((r) => r.done).length,
  }).filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
        <Stat label="Quiz terminés" value={qs.count} hint={qs.count ? `Moyenne ${qs.average} % · meilleur ${qs.best} %` : "Aucun pour l’instant"} />
        <Stat label="Formations en cours" value={inProgress.length} hint="Gratuites, à votre rythme" />
        <Stat
          label="Brevets obtenus"
          value={brevets}
          hint={brevets ? "Bravo !" : "Réussissez un examen final"}
          action={<StatButton onClick={() => go(brevets ? "brevets" : "formations")}>{brevets ? "Voir mes brevets" : "Voir les formations"}</StatButton>}
        />
        <Stat
          label="Badges"
          value={`${earned} / 12`}
          hint="à débloquer"
          action={<StatButton onClick={() => go(earned ? "badges" : "formations")}>{earned ? "Voir mes badges" : "Voir les formations"}</StatButton>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <p className="flex items-center gap-2 text-sm font-bold text-primary"><PlayCircle className="size-4" /> Reprendre</p>
          {resume ? (
            <>
              <p className="mt-2 text-lg font-bold text-foreground">{resume.c.title}</p>
              <p className="text-sm text-muted-foreground">{resume.s.chaptersDone} / {resume.s.chaptersTotal} chapitres validés</p>
              <Bar value={resume.s.percent} className="mt-3" />
              <Button asChild variant="brand" className="mt-4 rounded-full">
                <Link to="/formations/$courseId" params={{ courseId: resume.c.id }} search={{ step: resume.s.examUnlocked ? "exam" : resume.c.chapters.find((_, i) => i >= resume.s.chaptersDone)?.id ?? "intro" }}>
                  Continuer <ArrowRight />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-foreground">Commencez une formation pour suivre votre progression ici.</p>
              <Button variant="brand" className="mt-4 rounded-full" onClick={() => go("formations")}>Voir les formations <ArrowRight /></Button>
            </>
          )}
        </Panel>
        <Panel>
          <p className="flex items-center gap-2 text-sm font-bold text-primary"><Target className="size-4" /> Prochain soin</p>
          {next ? (
            <>
              <p className="mt-2 text-lg font-bold text-foreground">{next.title}</p>
              <p className="text-sm text-muted-foreground">
                {data.pets.find((p) => p.id === next.pet_id)?.name ?? "Tous mes animaux"} · {frDate(next.due_date)}
              </p>
              <Button variant="soft" className="mt-4 rounded-full" onClick={() => go("rappels")}>Voir mes rappels</Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-foreground">Aucun rappel prévu. Notez les vaccins et vermifuges de vos animaux.</p>
              <Button variant="soft" className="mt-4 rounded-full" onClick={() => go("rappels")}>Ajouter un rappel</Button>
            </>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-bold text-foreground">Progression par animal (quiz)</p>
          <a href={QUIZ_URL} className="text-sm font-semibold text-primary hover:underline">Faire un quiz</a>
        </div>
        {qs.species.length ? (
          <ul className="mt-4 space-y-3">
            {qs.species.slice(0, 8).map((s) => (
              <li key={s.species} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate font-semibold text-foreground">{s.label}</span>
                <Bar value={s.average} />
                <span className="w-24 text-right text-muted-foreground">{s.average} % · {s.count} quiz</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Vos résultats par animal apparaîtront après votre premier quiz.</p>
        )}
      </Panel>
    </div>
  );
}

/* ---------- 2. Mes formations ---------- */
/** Un seul rang de filtres (niveau ou état) qui alimente un seul carrousel : page légère, une formation à la fois sur téléphone. */
const FILTERS = [
  ["all", "Toutes"],
  ["Débutant", "Débutant"],
  ["Intermédiaire", "Intermédiaire"],
  ["Avancé", "Avancé"],
  ["progress", "En cours"],
  ["done", "Terminées"],
  ["fav", "Favoris"],
] as const;
type Filter = (typeof FILTERS)[number][0];

const FILTER_SUB: Partial<Record<Filter, string>> = {
  Débutant: "Les bases, en quelques heures.",
  Intermédiaire: "Maladies, parasites et animaux d’élevage.",
  Avancé: "Parcours longs, jusqu’à une semaine.",
};

export function Formations({ data, go }: SectionProps) {
  const statuses = useStatuses(data);
  const [filter, setFilter] = useState<Filter>("all");
  const entries: CourseEntry[] = statuses.map(({ c, s }) => ({ c, s, favorite: !!data.progress[c.id]?.favorite }));
  const inProgress = entries.filter((e) => e.s.started && !e.s.passed);
  const brevets = entries.filter((e) => e.s.passed).length;
  const resume = [...inProgress].sort((a, b) => (data.progress[b.c.id]?.updated_at ?? "").localeCompare(data.progress[a.c.id]?.updated_at ?? ""))[0];
  const list = entries.filter((e) =>
    filter === "all" ? true
    : filter === "progress" ? e.s.started && !e.s.passed
    : filter === "done" ? e.s.passed
    : filter === "fav" ? e.favorite
    : e.c.level === filter,
  );
  const count = (k: Filter) => (k === "progress" ? inProgress.length : k === "done" ? brevets : 0);
  const label = FILTERS.find(([k]) => k === filter)?.[1] ?? "";
  const sub = FILTER_SUB[filter];

  return (
    <div className="space-y-8">
      {/* En-tête façon Cisco : annonce, grand titre, deux boutons, mosaïque de 3 photos. */}
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <Link to="/formations/$courseId" params={{ courseId: "premiers-secours" }} search={{ step: "intro" }}
            className="inline-flex max-w-full items-start gap-3 rounded-3xl border border-border bg-card px-4 py-2.5 text-[13px] leading-snug text-muted-foreground shadow-sm transition-colors hover:border-primary">
            <Flame className="mt-0.5 size-5 shrink-0 text-award" />
            <span>
              <b className="block text-foreground">Les urgences n’attendent pas !</b>
              Découvrez pourquoi notre formation <span className="font-semibold text-primary underline underline-offset-2">Secouriste animalier</span> est la plus suivie
            </span>
          </Link>
          <h2 className="mt-6 font-display text-[40px] font-normal leading-[1.05] text-foreground sm:text-6xl">
            Apprenez à soigner.<br />Protégez vos animaux.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Des formations gratuites en ligne, chapitre par chapitre, avec un quiz à chaque étape et un brevet à la fin. Des chiens et chats aux volailles, bovins et poissons : tout est ici.
          </p>
          <p className="mt-4 text-[15px] font-semibold text-foreground">Prêt à commencer, à progresser ou à en faire votre métier ?</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="brand" className="h-12 rounded-full px-7 text-[15px]">
              <Link to="/formations">Commencer à apprendre</Link>
            </Button>
            <Button variant="brandOutline" className="h-12 rounded-full px-7 text-[15px]"
              onClick={() => document.getElementById("mes-formations")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              Explorer les sujets
            </Button>
          </div>
          {resume ? (
            <Link to="/formations/$courseId" params={{ courseId: resume.c.id }} search={{ step: resumeStep(resume.c, resume.s) }}
              className="mt-4 inline-flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <PlayCircle className="size-4 shrink-0 text-primary" />
              <span className="truncate">Reprendre : <b className="text-foreground">{resume.c.title}</b> · {resume.s.percent} %</span>
            </Link>
          ) : null}
        </div>
        <div className="relative mx-auto grid h-[300px] w-full max-w-[460px] grid-cols-2 grid-rows-2 gap-3 overflow-hidden sm:h-[400px] [&>img]:min-h-0" aria-hidden>
          <div className="bg-dots absolute -left-4 bottom-6 size-28" />
          <img src="/site/assets/img/animal-companion-640.webp" alt="" className="shape-leaf relative row-span-2 my-auto h-[72%] w-full object-cover object-[70%_center] shadow-soft-card" />
          <img src="/site/assets/img/dogs-walk-640.webp" alt="" className="shape-leaf-alt relative h-full w-full object-cover shadow-soft-card" />
          <img src="/site/assets/img/conseils/bovins.webp" alt="" className="shape-leaf relative h-full w-full object-cover shadow-soft-card" />
        </div>
      </section>

      {/* Filtres : une seule ligne qui défile sur téléphone. */}
      <div id="mes-formations" className="-mx-1 flex scroll-mt-24 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtrer les formations">
        {FILTERS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
            className={cn("shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary")}>
            {l}{count(k) ? ` (${count(k)})` : ""}
          </button>
        ))}
      </div>

      {list.length ? (
        <CourseCarousel key={filter} title={filter === "all" ? "Toutes les formations" : label} hideTitle={filter === "all"} sub={sub} items={list} />
      ) : (
        <Empty title="Rien ici pour le moment" text={filter === "fav" ? "Ajoutez une formation à vos favoris depuis sa page." : "Commencez une formation pour la retrouver ici."} />
      )}


      {/* Photo + texte, comme « Prepare and find your next job ». */}
      <section className="grid items-center overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2">
        <img src="/site/assets/img/dogs-walk-1100.webp" alt="Une personne promène ses chiens" loading="lazy" className="h-56 w-full object-cover md:h-full md:min-h-[320px] md:rounded-r-[120px]" />
        <div className="p-6 sm:p-10">
          <h3 className="font-display text-3xl font-normal leading-tight text-foreground sm:text-4xl">
            Prenez soin de vos animaux, <span className="text-primary underline decoration-primary/40 underline-offset-8">avec assurance</span>
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Chaque formation vous guide pas à pas : lecture, quiz, puis examen final. À la fin, votre brevet prouve ce que vous savez faire.
          </p>
          <Button variant="brandOutline" className="mt-6 h-11 rounded-full px-6" onClick={() => go("brevets")}>
            Voir mes brevets <ArrowRight />
          </Button>
        </div>
      </section>

      {/* Bandeau chiffres, comme « Why get certified? ». */}
      <section className="rounded-3xl bg-academy-band px-6 py-10 text-center text-photo-foreground sm:px-10 sm:py-14">
        <h3 className="font-display text-3xl font-normal sm:text-4xl">Pourquoi obtenir un brevet ?</h3>
        <p className="mt-2 text-sm text-photo-muted">Il prouve ce que vous savez faire pour vos animaux, votre élevage ou votre métier.</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-photo-muted/25">
          {[
            [`${Math.round(CHAPTER_PASS_RATIO * 100)} %`, "de bonnes réponses pour valider chaque chapitre"],
            [`${EXAM_PASS_NOTE}/20`, "à l’examen final pour obtenir le brevet"],
            ["100 %", "gratuit, du débutant au professionnel"],
          ].map(([n, t]) => (
            <div key={t} className="px-4">
              <p className="font-display text-5xl font-light text-photo-accent">{n}</p>
              <p className="mx-auto mt-2 max-w-[220px] text-[15px] text-photo-muted">{t}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- 3. Mes quiz ---------- */
export function Quizzes({ data, reload, who }: SectionProps) {
  const [open, setOpen] = useState<string | null>(null);
  const del = async (a: QuizAttempt) => {
    if (!window.confirm("Supprimer ce quiz de votre historique ?")) return;
    await deleteQuizAttempt(a.id);
    await reload();
  };
  return (
    <>
      <SectionTitle title="Mes quiz" sub="Tous les quiz terminés en étant connecté, avec la correction complète et le PDF." action={<Button asChild variant="brand" className="rounded-full"><a href={QUIZ_URL}>Faire un quiz</a></Button>} />
      {data.quizzes.length ? (
        <ul className="space-y-3">
          {data.quizzes.map((a) => {
            const pct = percentOf(a.score, a.total);
            const isOpen = open === a.id;
            return (
              <li key={a.id}>
                <Panel className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn("grid size-12 shrink-0 place-items-center rounded-full font-display text-lg font-bold", pct >= 70 ? "bg-success-soft text-accent-foreground" : "bg-warning-soft text-award-foreground")}>{pct}%</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground">{a.species_label} · {a.level_label}</p>
                      <p className="text-sm text-muted-foreground">{formatPlayedAt(a.played_at)} · {a.score}/{a.total} · {formatDuration(a.elapsed_seconds)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="soft" size="sm" className="rounded-full" onClick={() => { const n = quizNumber(data.quizzes, a.id); downloadBlob(buildQuizPdf(a, who, n), quizPdfName(a, n)); }}><Download /> PDF</Button>
                      <Button variant="ghost" size="sm" className="rounded-full" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : a.id)}>
                        Correction <ChevronDown className={cn("transition-transform", isOpen && "rotate-180")} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Supprimer ce quiz" onClick={() => del(a)}><Trash2 /></Button>
                    </div>
                  </div>
                  {isOpen ? (
                    <ol className="mt-4 space-y-3 border-t border-border pt-4">
                      {a.questions.map((q, i) => {
                        const ok = q.choice === q.correct;
                        return (
                          <li key={i} className={cn("rounded-xl border p-3 text-sm", ok ? "border-primary/20 bg-success-soft" : "border-destructive/20 bg-destructive-soft")}>
                            <p className="font-bold text-foreground">{i + 1}. {q.q}</p>
                            <p className="mt-1 text-foreground">Votre réponse : <b>{q.choice === null ? "aucune" : q.options[q.choice]}</b></p>
                            {!ok ? <p className="text-foreground">Bonne réponse : <b>{q.options[q.correct]}</b></p> : null}
                            {q.exp ? <p className="mt-1 text-muted-foreground">{q.exp}</p> : null}
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="Aucun quiz enregistré" text="Faites un quiz en étant connecté : il apparaîtra ici avec sa correction et son PDF." action={<Button asChild variant="brand" className="rounded-full"><a href={QUIZ_URL}>Faire un quiz</a></Button>} />
      )}
    </>
  );
}

/* ---------- 4. Bulletin de notes ---------- */
export function Report({ data, who }: SectionProps) {
  const statuses = useStatuses(data);
  const graded = statuses.filter((x) => x.s.bestExam);
  const avg = graded.length ? graded.reduce((t, x) => t + (x.s.bestExam?.note ?? 0), 0) / graded.length : null;
  return (
    <>
      <SectionTitle
        title="Bulletin de notes"
        sub="Votre moyenne, vos examens et vos brevets. Le détail est dans le bulletin PDF."
        action={<Button variant="brand" className="rounded-full" onClick={() => downloadBlob(buildReportPdf(COURSES, scoresOf(data), data.exams, who), "vetocare-bulletin.pdf")}><Download /> Bulletin PDF</Button>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Moyenne des examens" value={avg === null ? "–" : `${frNote(Math.round(avg * 10) / 10)}/20`} />
        <Stat label="Examens passés" value={data.exams.length} />
        <Stat label="Brevets" value={statuses.filter((x) => x.s.passed).length} />
      </div>
    </>
  );
}

/* ---------- 5. Mes brevets ---------- */
export function Certificates({ data, who, go }: SectionProps) {
  const statuses = useStatuses(data).filter((x) => x.s.passed && x.s.bestExam);
  return (
    <>
      <SectionTitle title="Mes brevets" sub="Un brevet VetoCare pour chaque formation réussie (14/20, soit 70 %, ou plus à l’examen final)." />
      <p role="note" className="mb-5 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <b className="text-foreground">{CERTIFICATE_DISCLAIMER}.</b> Le brevet atteste que vous avez suivi et réussi une formation VetoCare ; ce n’est pas un diplôme officiel ni un titre reconnu par l’État.
      </p>
      {statuses.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {statuses.map(({ c, s }) => (
            <Panel key={c.id} className="border-award/40 bg-award-soft">
              <CertificateCard course={c} exam={s.bestExam!} who={who} />
              <p className="mt-4 font-display text-lg leading-snug text-foreground">{c.title}</p>
              <p className="mt-1 text-sm text-award-foreground">
                {frNote(s.bestExam!.note)} / 20 · {mention(s.bestExam!.note)} · {frDate(s.bestExam!.created_at)}
              </p>
              <Button variant="brand" className="mt-4 rounded-full" onClick={() => downloadBlob(buildCertificatePdf(c, s.bestExam!, who), certificatePdfName(c))}>
                <Download /> Télécharger le brevet
              </Button>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty title="Pas encore de brevet" text="Validez les chapitres d’une formation puis réussissez son examen final pour obtenir votre premier brevet." action={<Button variant="brand" className="rounded-full" onClick={() => go("formations")}>Voir les formations</Button>} />
      )}
    </>
  );
}

/* ---------- 6. Téléchargements ---------- */
export function Downloads({ data, who }: SectionProps) {
  const statuses = useStatuses(data).filter((x) => x.s.passed && x.s.bestExam);
  const Row = ({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) => (
    <li className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0">
      <FileText className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1"><p className="truncate font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
      <Button variant="soft" size="sm" className="rounded-full" onClick={onClick}><Download /> PDF</Button>
    </li>
  );
  return (
    <>
      <SectionTitle title="Téléchargements" sub="Tous vos documents au même endroit : bulletin, brevets et corrections de quiz." />
      <Panel className="p-0">
        <ul>
          <Row title="Bulletin de notes" sub="Toutes vos formations" onClick={() => downloadBlob(buildReportPdf(COURSES, scoresOf(data), data.exams, who), "vetocare-bulletin.pdf")} />
          {statuses.map(({ c, s }) => (
            <Row key={c.id} title={`Brevet · ${c.title}`} sub={`${frNote(s.bestExam!.note)} / 20 · ${mention(s.bestExam!.note)}`} onClick={() => downloadBlob(buildCertificatePdf(c, s.bestExam!, who), certificatePdfName(c))} />
          ))}
          {data.quizzes.map((a) => (
            <Row key={a.id} title={`Quiz n° ${quizNumber(data.quizzes, a.id)} · ${a.species_label} · ${a.level_label}`} sub={`${formatPlayedAt(a.played_at)} · ${a.score}/${a.total}`} onClick={() => { const n = quizNumber(data.quizzes, a.id); downloadBlob(buildQuizPdf(a, who, n), quizPdfName(a, n)); }} />
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* ---------- 7. Badges ---------- */
export function Badges({ data }: SectionProps) {
  const list = computeBadges({
    quizzes: data.quizzes,
    progress: scoresOf(data),
    exams: data.exams,
    pets: data.pets.length,
    remindersDone: data.reminders.filter((r) => r.done).length,
  });
  return (
    <>
      <SectionTitle title="Mes badges" sub={`${list.filter((b) => b.earned).length} badges gagnés sur ${list.length}.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <Panel key={b.id} className={cn("flex items-center gap-3 p-4", !b.earned && "opacity-60 shadow-none")}>
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", b.earned ? "bg-award-soft text-award" : "bg-muted text-muted-foreground")}>
              {b.earned ? <Award className="size-6" /> : <Lock className="size-5" />}
            </span>
            <div><p className="font-bold text-foreground">{b.title}</p><p className="text-sm text-muted-foreground">{b.text}</p></div>
          </Panel>
        ))}
      </div>
    </>
  );
}

/* ---------- 8. Mon carnet ---------- */
export function Notebook({ data, reload }: SectionProps) {
  const legacy = COURSES.filter((c) => data.progress[c.id]?.notes.trim());
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const save = async (id: string) => {
    await updateNote(id, draft);
    setEditing(null);
    await reload();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    await deleteNote(id);
    await reload();
  };
  return (
    <>
      <SectionTitle title="Mon carnet" sub="Les notes prises pendant vos formations, avec le titre du cours et la date." />
      {data.notes.length || legacy.length ? (
        <div className="space-y-3">
          {data.notes.map((n) => (
            <Panel key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to="/formations/$courseId" params={{ courseId: n.course_id }} className="flex items-center gap-2 font-bold text-foreground hover:text-primary">
                    <NotebookPen className="size-4 shrink-0 text-primary" /> {n.course_title || COURSES.find((c) => c.id === n.course_id)?.title || "Formation"}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatPlayedAt(n.created_at)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label="Modifier la note" onClick={() => { setEditing(n.id); setDraft(n.body); }}><Pencil /></Button>
                  <Button variant="ghost" size="icon" aria-label="Supprimer la note" onClick={() => remove(n.id)}><Trash2 /></Button>
                </div>
              </div>
              {editing === n.id ? (
                <div className="mt-3">
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} rows={5} className="bg-background" />
                  <div className="mt-2 flex gap-2">
                    <Button variant="brand" size="sm" className="rounded-full" disabled={!draft.trim()} onClick={() => save(n.id)}>Enregistrer</Button>
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setEditing(null)}>Annuler</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{n.body}</p>
              )}
            </Panel>
          ))}
          {legacy.map((c) => (
            <Panel key={c.id}>
              <p className="flex items-center gap-2 font-bold text-foreground"><NotebookPen className="size-4 text-primary" /> {c.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Notes précédentes · {formatPlayedAt(data.progress[c.id]!.updated_at)}</p>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{data.progress[c.id]!.notes}</p>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty title="Carnet vide" text="Dans une formation, touchez le bouton carnet en bas à droite pour noter ce que vous voulez retenir : vos notes arrivent ici." />
      )}
    </>
  );
}

/* ---------- 9. Objectifs ---------- */
const HOURS = Array.from({ length: 24 }, (_, h) => h);
export function Goals({ data, reload }: SectionProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GoalKind>("quiz");
  const [target, setTarget] = useState("2");
  const [period, setPeriod] = useState<GoalPeriod>("day");
  const [hour, setHour] = useState("18");
  const [error, setError] = useState("");
  const now = new Date();
  const active = data.goals.filter((g) => !g.achieved_at);
  const achieved = data.goals.filter((g) => g.achieved_at).sort((a, b) => (b.achieved_at ?? "").localeCompare(a.achieved_at ?? "")).slice(0, 5);
  const progressRows = Object.values(data.progress);
  const add = async () => {
    setError("");
    try {
      await addGoal({ kind, target: Math.min(50, Math.max(1, Math.round(Number(target) || 1))), period, remind_hour: Number(hour) });
      setOpen(false);
      await reload();
    } catch {
      setError("Ajout impossible. Réessayez.");
    }
  };
  const remove = async (id: string) => {
    await deleteGoal(id);
    await reload();
  };
  const sel = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground";
  return (
    <>
      <SectionTitle
        title="Mes objectifs"
        sub="Fixez-vous un objectif : nous vous le rappelons à l’heure choisie, et il est retiré dès qu’il est atteint."
        action={<Button variant="brand" className="rounded-full" onClick={() => setOpen((v) => !v)}><Plus /> Ajouter un objectif</Button>}
      />
      <PushOptIn text="À l’heure choisie, si l’objectif n’est pas encore atteint, vous recevez un rappel avec le lien pour le faire." />
      {open ? (
        <Panel className="mb-5">
          <p className="font-bold text-foreground">Nouvel objectif</p>
          {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-sm font-semibold text-foreground">Faire
              <Input type="number" min={1} max={50} value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 h-11 rounded-xl bg-background" />
            </label>
            <label className="text-sm font-semibold text-foreground">Quoi
              <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)} className={cn(sel, "mt-1")}>
                <option value="quiz">Quiz</option>
                <option value="chapter">Chapitres validés</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-foreground">Quand
              <select value={period} onChange={(e) => setPeriod(e.target.value as GoalPeriod)} className={cn(sel, "mt-1")}>
                <option value="day">Par jour</option>
                <option value="week">Par semaine</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-foreground">Me rappeler à
              <select value={hour} onChange={(e) => setHour(e.target.value)} className={cn(sel, "mt-1")}>
                {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")} h 00</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="brand" className="rounded-full" onClick={add}>Enregistrer l’objectif</Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Annuler</Button>
          </div>
        </Panel>
      ) : null}
      {active.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((g) => {
            const done = goalProgress(g, data.quizzes, progressRows, now);
            return (
              <Panel key={g.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground">{goalTitle(g)}</p>
                    <p className="text-xs text-muted-foreground">Rappel à {String(g.remind_hour).padStart(2, "0")} h · {g.period === "day" ? "aujourd’hui" : "cette semaine"}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Supprimer l’objectif" onClick={() => remove(g.id)}><Trash2 /></Button>
                </div>
                <p className="mt-2 font-display text-4xl text-foreground">{Math.min(done, g.target)} <span className="text-xl text-muted-foreground">/ {g.target}</span></p>
                <Bar value={(done / g.target) * 100} className="mt-3" />
                <Button asChild variant="soft" size="sm" className="mt-3 rounded-full">
                  <a href={goalLink(g.kind)}>{g.kind === "quiz" ? "Faire un quiz" : "Continuer une formation"} <ArrowRight /></a>
                </Button>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Empty title="Aucun objectif en cours" text="Exemple : 2 quiz par jour, avec un rappel à 18 h." action={open ? undefined : <Button variant="brand" className="rounded-full" onClick={() => setOpen(true)}><Plus /> Ajouter un objectif</Button>} />
      )}
      {achieved.length ? (
        <Panel className="mt-5">
          <p className="font-bold text-foreground">Objectifs atteints</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {achieved.map((g) => (
              <li key={g.id} className="flex items-center gap-2"><Check className="size-4 text-primary" /> {goalTitle(g)} · {formatPlayedAt(g.achieved_at!)}</li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
