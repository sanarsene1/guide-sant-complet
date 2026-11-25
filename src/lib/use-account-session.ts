import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { syncAccountCache } from "./account-data";
import { sessionRetryDelays, signInRememberedOnDevice } from "./auth-helpers";

export const SIGN_IN_PAGE = "/espace-veterinaire";

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Session de la personne connectée. Avant de renvoyer vers la page de connexion,
 * la session est revérifiée plusieurs fois : au premier chargement, la session
 * peut arriver avec un peu de retard (aperçu, réseau lent, jeton à renouveler).
 */
export function useAccountSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let settled = false;
    // Navigation dans l'application (sans recharger toute la page) : plus rapide sur réseau lent.
    const toSignIn = (next?: string) =>
      void router.navigate({ href: next ? SIGN_IN_PAGE + "?next=" + encodeURIComponent(next) : SIGN_IN_PAGE, replace: true });

    const accept = (s: Session) => {
      if (!active) return;
      settled = true;
      setSession(s);
      setReady(true);
      syncAccountCache(s);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (next) {
        accept(next);
        return;
      }
      // Déconnexion pendant la visite (bouton « Se déconnecter » ou autre onglet).
      if (event === "SIGNED_OUT" && settled) {
        syncAccountCache(null);
        toSignIn();
      }
    });

    void (async () => {
      const delays = sessionRetryDelays(signInRememberedOnDevice(window.localStorage));
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        if (!active || settled) return;
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session) return accept(data.session);
        } catch {
          /* réseau indisponible : on réessaie */
        }
        const delay = delays[attempt];
        if (delay !== undefined) await wait(delay);
      }
      if (!active || settled) return;
      syncAccountCache(null);
      toSignIn(window.location.pathname + window.location.search);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return { session, ready };
}
