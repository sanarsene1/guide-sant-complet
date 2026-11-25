import { createFileRoute } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardList,
  Download,
  GraduationCap,
  LayoutDashboard,
  Menu,
  NotebookPen,
  PawPrint,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import { Brand } from "@/components/auth/brand";
import { UserAvatar } from "@/components/account/avatar";
import type { AccountData, SectionProps } from "@/components/account/shared";
import { Badges, Certificates, Downloads, Formations, Goals, Notebook, Overview, Quizzes, Report } from "@/components/account/sections-learn";
import { LegalLinks } from "@/components/legal/legal-links";
import { Pets, Profile, Reminders, Security } from "@/components/account/sections-life";
import { ThemeMenu, ThemeSwitch } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { listExams, listGoals, listNotes, listPets, listProgress, listQuizAttempts, listReminders, markGoalAchieved, syncPendingQuizzes } from "@/lib/account-data";
import { goalProgress, isGoalReached } from "@/lib/goals";
import { ACCOUNT_CACHE_KEY, accountSummary, shortName } from "@/lib/auth-helpers";
import { useAccountSession } from "@/lib/use-account-session";
import { AccountLoading, ContentSkeleton } from "@/components/account/loading";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; icon: ComponentType<{ className?: string }>; C: ComponentType<SectionProps> };
const GROUPS: { title: string; tabs: Tab[] }[] = [
  {
    title: "Apprendre",
    tabs: [
      { id: "apercu", label: "Aperçu", icon: LayoutDashboard, C: Overview },
      { id: "formations", label: "Mes formations", icon: GraduationCap, C: Formations },
      { id: "quiz", label: "Mes quiz", icon: ClipboardList, C: Quizzes },
      { id: "notes", label: "Bulletin de notes", icon: BarChart3, C: Report },
      { id: "brevets", label: "Mes brevets", icon: Trophy, C: Certificates },
      { id: "telechargements", label: "Téléchargements", icon: Download, C: Downloads },
      { id: "badges", label: "Badges", icon: Award, C: Badges },
      { id: "carnet", label: "Mon carnet", icon: NotebookPen, C: Notebook },
      { id: "objectifs", label: "Objectifs", icon: Target, C: Goals },
    ],
  },
  {
    title: "Mes animaux",
    tabs: [
      { id: "animaux", label: "Mes animaux", icon: PawPrint, C: Pets },
      { id: "rappels", label: "Rappels de soins", icon: Bell, C: Reminders },
    ],
  },
  {
    title: "Compte",
    tabs: [
      { id: "profil", label: "Mon profil", icon: UserRound, C: Profile },
      { id: "securite", label: "Sécurité et données", icon: ShieldCheck, C: Security },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.tabs);

export const Route = createFileRoute("/mon-compte")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { tab?: string } =>
    typeof s["tab"] === "string" && ALL.some((t) => t.id === s["tab"]) ? { tab: s["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Mon compte – VetoCare" },
      { name: "description", content: "Vos formations, quiz, notes, brevets, animaux et rappels de soins sur VetoCare." },
      { property: "og:title", content: "Mon compte – VetoCare" },
      { property: "og:description", content: "Formations, brevets, historique des quiz et suivi de vos animaux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "icon", href: "/site/assets/favicon.svg" }],
  }),
  // Affiché tout de suite (dès la réponse du serveur) pendant que la page se charge :
  // sur une connexion lente, on ne voit plus un écran vide.
  pendingComponent: AccountLoading,
  pendingMs: 0,
  component: AccountSpace,
});

/** Prénom mémorisé sur cet appareil, pour saluer la personne avant même la fin du chargement. */
function useCachedFirstName() {
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(ACCOUNT_CACHE_KEY) || "null") as { name?: string } | null;
      if (a?.name) setName(shortName(a.name));
    } catch {
      /* rien en cache */
    }
  }, []);
  return name;
}

function NavList({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{g.title}</p>
          <ul className="mt-2 space-y-0.5">
            {g.tabs.map((t) => {
              const on = t.id === current;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t.id)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors",
                      on ? "bg-nav-active font-bold text-accent-foreground" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn("absolute inset-y-2 left-0 w-1 rounded-full bg-primary transition-opacity", on ? "opacity-100" : "opacity-0")}
                    />
                    <t.icon className={cn("size-[18px] shrink-0", on ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AccountSpace() {
  const { tab = "apercu" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { session, ready } = useAccountSession();
  const cachedName = useCachedFirstName();
  const [data, setData] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [slow, setSlow] = useState(false);

  const reload = useCallback(async (freshUser?: User) => {
    const user = freshUser ?? session?.user;
    if (!user) return;
    try {
      await syncPendingQuizzes(user.id).catch(() => 0);
      const [quizzes, progress, exams, pets, reminders, notes, goalRows] = await Promise.all([
        listQuizAttempts(), listProgress(), listExams(), listPets(), listReminders(), listNotes(), listGoals(),
      ]);
      // Un objectif atteint est retiré de la liste active.
      const now = new Date();
      const goals = await Promise.all(
        goalRows.map(async (g) => {
          if (g.achieved_at || !isGoalReached(g, goalProgress(g, quizzes, progress, now))) return g;
          await markGoalAchieved(g.id).catch(() => undefined);
          return { ...g, achieved_at: now.toISOString() };
        }),
      );
      setData({ user, quizzes, progress: Object.fromEntries(progress.map((p) => [p.course_id, p])), exams, pets, reminders, notes, goals });
      setError("");
    } catch {
      setError("Impossible de charger votre compte. Vérifiez votre connexion puis rechargez la page.");
    }
  }, [session]);

  useEffect(() => {
    if (data || error) return;
    const t = window.setTimeout(() => setSlow(true), 10000);
    return () => window.clearTimeout(t);
  }, [data, error]);

  useEffect(() => {
    if (ready) void reload();
  }, [ready, reload]);

  const go = (id: string) => {
    setMenuOpen(false);
    navigate({ search: { tab: id } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const current = ALL.find((t) => t.id === tab) ?? ALL[0]!;
  const user = data?.user ?? session?.user ?? null;
  const who = user ? accountSummary(user).name : "";
  const first = who ? shortName(who) : cachedName;
  const C = current.C;

  return (
    <div lang="fr" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-header-glass backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <a
              href="/site/index.html"
              className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary sm:inline-flex"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Retour au site
            </a>
            <ThemeMenu />
            <Button
              variant="iconSoft"
              size="iconRound"
              className="lg:hidden"
              aria-label="Ouvrir le menu du compte"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-account-hero text-photo-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-7 sm:gap-5 sm:px-6 sm:py-10">
          {user ? (
            <UserAvatar user={user} className="size-14 text-xl ring-4 ring-photo-foreground/20 sm:size-20 sm:text-3xl" />
          ) : (
            <span aria-hidden="true" className="size-14 shrink-0 animate-pulse rounded-full bg-photo-foreground/15 sm:size-20" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-photo-accent">Mon compte</p>
            <h1 className="truncate font-display text-[28px] leading-tight sm:text-[40px]">
              {first ? `Bonjour ${first}` : "Bonjour"}
            </h1>
            {user ? (
              <p className="truncate text-sm text-photo-muted">{user.email || user.phone}</p>
            ) : (
              <span aria-hidden="true" className="mt-2 block h-4 w-44 animate-pulse rounded bg-photo-foreground/15" />
            )}
          </div>
        </div>
      </section>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[86%] max-w-sm flex-col gap-0 border-border bg-background p-0">
          <div className="border-b border-border px-5 pb-4 pt-5">
            <SheetTitle className="sr-only">Menu du compte</SheetTitle>
            <SheetDescription className="sr-only">Choisissez une rubrique de votre compte.</SheetDescription>
            <div className="flex items-center gap-3 pr-8">
              {user ? <UserAvatar user={user} className="size-11" /> : <span className="size-11 rounded-full bg-muted" />}
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{who || first || "Mon compte"}</p>
                {user ? <p className="truncate text-sm text-muted-foreground">{user.email || user.phone}</p> : null}
              </div>
            </div>
          </div>
          <nav aria-label="Rubriques du compte" className="flex-1 overflow-y-auto px-3 py-5">
            <NavList current={current.id} onPick={go} />
          </nav>
          <div className="space-y-3 border-t border-border px-5 py-4">
            <ThemeSwitch />
            <a
              href="/site/index.html"
              className="flex items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" /> Retour au site
            </a>
          </div>
        </SheetContent>
      </Sheet>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[264px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block">
          <nav
            aria-label="Rubriques du compte"
            className="sticky top-24 rounded-2xl border border-border bg-card p-3 shadow-soft-card"
          >
            <NavList current={current.id} onPick={go} />
          </nav>
        </aside>

        <main key={current.id} className="min-w-0 animate-rise">
          {error ? (
            <p role="alert" className="mb-5 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {data ? (
            <>
              {current.id === "apercu" ? <h2 className="mb-6 font-display text-[30px] text-foreground">Aperçu</h2> : null}
              <C data={data} reload={reload} go={go} who={who} />
            </>
          ) : slow && !error ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">Le chargement prend plus de temps que prévu. Vérifiez votre connexion.</p>
              <Button variant="brand" className="mt-4 rounded-full" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
            </div>
          ) : !error ? (
            <ContentSkeleton />
          ) : null}
        </main>
      </div>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <BookOpen className="mx-auto mb-1 size-4" /> VetoCare · contenu éducatif, ne remplace pas l’avis d’un vétérinaire
        <LegalLinks className="mt-3 px-4" />
      </footer>
    </div>
  );
}
