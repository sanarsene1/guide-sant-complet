import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Brand } from "@/components/auth/brand";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/components/legal/legal-links";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politique de cookies – VetoCare" },
      { name: "description", content: "Ce que VetoCare garde sur votre appareil, la mesure d’audience, les notifications et vos choix." },
      { property: "og:title", content: "Politique de cookies – VetoCare" },
      { property: "og:description", content: "Mesure d’audience sans cookies, notifications et services utilisés par VetoCare." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

const STORAGE: [string, string][] = [
  ["Connexion", "Garde votre session ouverte quand vous êtes connecté à « Mon compte »."],
  ["Mon compte (menu)", "Votre prénom, votre initiale et votre photo, pour les afficher dans le menu du site."],
  ["Mode sombre", "Le thème que vous avez choisi (clair, sombre ou automatique)."],
  ["Quiz en attente", "Un quiz terminé, gardé le temps de l’enregistrer dans votre compte."],
  ["Images des fiches", "L’adresse des photos d’animaux déjà trouvées, pour charger les pages plus vite."],
  ["Vos choix", "Votre réponse sur la mesure d’audience et sur les notifications."],
];

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-header-glass backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <a href="/site/index.html" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Retour au site
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Vos données</p>
          <h1 className="font-display text-4xl text-foreground sm:text-5xl">Politique de cookies</h1>
          <p className="text-muted-foreground">Mise à jour le 21 novembre 2026. Cette page explique ce que VetoCare garde sur votre appareil, ce qui est mesuré, et comment changer vos choix.</p>
          <Button variant="brand" className="rounded-full" onClick={() => window.vcConsent?.open()}>
            <Settings2 /> Paramètres des cookies
          </Button>
        </div>

        <Section title="1. Ce qui est gardé sur votre appareil">
          <p>VetoCare ne pose pas de cookie publicitaire. Pour fonctionner, le site garde quelques informations dans la mémoire de votre navigateur. Elles sont nécessaires et restent actives :</p>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {STORAGE.map(([k, v]) => (
              <li key={k} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-4">
                <b className="w-44 shrink-0 text-foreground">{k}</b>
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <p>Vous pouvez les effacer à tout moment dans les réglages de votre navigateur. Vous serez alors déconnecté et vos choix seront redemandés.</p>
        </Section>

        <Section title="2. Mesure d’audience">
          <p>Nous utilisons la mesure d’audience de Lovable, l’outil qui héberge VetoCare. Elle n’utilise aucun cookie, ne garde rien sur votre appareil, ne conserve pas votre adresse IP et ne permet pas de savoir qui vous êtes. Lovable collecte ces données pour nous. <a className="font-semibold text-primary underline underline-offset-2" href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">La politique de confidentialité de Lovable</a> explique comment elle les traite.</p>
          <p>Elle enregistre : les pages visitées, le site d’où vous venez, votre pays, votre navigateur, votre système et le type d’appareil (ordinateur, téléphone ou tablette), le temps passé, la vitesse des pages, les erreurs et les clics sur les boutons et les liens. Les données détaillées sont gardées 90 jours, les résumés par jour pendant un an.</p>
          <p>Les clics sont enregistrés seulement si vous acceptez la mesure d’audience quand vous vous trouvez dans l’Union européenne, l’Espace économique européen, au Royaume-Uni, en Suisse ou au Québec (pour tout le Canada, puisque l’outil ne distingue pas les provinces). Ailleurs, ils sont enregistrés sauf si vous refusez. Ils ne le sont jamais si votre navigateur envoie le signal « Global Privacy Control », même après un accord.</p>
          <p>Les pages visitées, le temps passé, la vitesse des pages et les erreurs sont enregistrés pour tous les visiteurs, sans cookie et sans savoir qui ils sont. Votre choix est gardé dans votre navigateur jusqu’à 12 mois.</p>
        </Section>

        <Section title="3. Notifications sur votre téléphone">
          <p>Si vous les acceptez, VetoCare vous envoie des rappels : à la création d’un rappel de soin, la veille et le jour même (à 18 h la veille et 8 h le jour même, ou à l’heure que vous avez choisie), et à l’heure choisie pour vos objectifs tant qu’ils ne sont pas atteints.</p>
          <p>Votre téléphone vous demande de confirmer. Une fois d’accord, l’activation se fait toute seule dès que vous êtes connecté. Nous gardons dans votre compte l’adresse d’envoi propre à votre navigateur et votre fuseau horaire. Les notifications passent par le service de votre navigateur (Google pour Chrome, Mozilla pour Firefox, Apple pour Safari).</p>
          <p>Vous pouvez les couper dans « Paramètres des cookies », dans « Mon compte », ou dans les réglages de votre téléphone.</p>
        </Section>

        <Section title="4. Services extérieurs">
          <ul className="list-disc space-y-2 pl-5">
            <li><b className="text-foreground">Lovable Cloud</b> : héberge le site, les comptes et vos données (quiz, formations, animaux, rappels, notes).</li>
            <li><b className="text-foreground">Google Fonts</b> : fournit les polices d’écriture ; Google reçoit l’adresse IP de votre appareil au chargement.</li>
            <li><b className="text-foreground">Wikipédia et Wikimedia Commons</b> : fournissent certaines photos d’animaux ; ils reçoivent l’adresse IP de votre appareil au chargement.</li>
            <li><b className="text-foreground">YouTube</b> : certaines formations contiennent des vidéos en mode « confidentialité renforcée ». Rien n’est chargé tant que vous ne lancez pas la vidéo ; ensuite, YouTube (Google) peut garder des informations sur votre appareil.</li>
            <li><b className="text-foreground">Connexion avec Google ou Lovable</b> : si vous choisissez ce mode de connexion, ce service reçoit votre demande et nous transmet votre nom, votre adresse email et votre photo.</li>
          </ul>
        </Section>

        <Section title="5. Changer d’avis">
          <p>Vous pouvez changer vos choix à tout moment avec le bouton « Paramètres des cookies », en haut de cette page ou en bas de chaque page du site. Un refus n’empêche pas d’utiliser VetoCare.</p>
        </Section>
      </main>
      <footer className="border-t border-border px-4 py-6">
        <LegalLinks />
      </footer>
    </div>
  );
}
