import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/auth/brand";

// Écrans d'attente de « Mon compte ». Dans un fichier à part : la page découpe ses
// écrans en morceaux chargés séparément, qui ne peuvent pas partager une fonction du fichier de la page.

export function ContentSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Chargement de votre compte…
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-44 rounded-2xl" />
        <div className="skeleton h-44 rounded-2xl" />
      </div>
    </div>
  );
}

/** Écran d'attente de « Mon compte », visible avant que les scripts aient fini de charger. */
export function AccountLoading() {
  return (
    <div lang="fr" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-header-glass backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <a
            href="/site/index.html"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Retour au site
          </a>
        </div>
      </header>
      <section className="bg-account-hero text-photo-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-7 sm:gap-5 sm:px-6 sm:py-10">
          <span aria-hidden="true" className="size-14 shrink-0 animate-pulse rounded-full bg-photo-foreground/15 sm:size-20" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-photo-accent">Mon compte</p>
            <p className="font-display text-[28px] leading-tight sm:text-[40px]">Ouverture de votre compte…</p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <ContentSkeleton />
      </div>
    </div>
  );
}
