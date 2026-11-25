import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push-client";
import { sendTestPush, sendWelcomePush } from "@/lib/push.functions";
import { showPushBox } from "@/lib/push-visibility";
import { Panel } from "./shared";

const HELP: Partial<Record<PushState, string>> = {
  iframe: "Ouvrez VetoCare dans son propre onglet (ou sur votre téléphone) pour activer les notifications.",
  "ios-install": "Sur iPhone : touchez Partager puis « Sur l’écran d’accueil », ouvrez VetoCare depuis l’icône, puis activez les notifications ici.",
  unsupported: "Ce navigateur ne reçoit pas les notifications. Essayez Chrome sur Android.",
  denied: "Les notifications sont bloquées pour VetoCare. Autorisez-les dans les réglages du navigateur, puis revenez ici.",
};

/** Oui donné dans la fenêtre d'autorisation (ou pas encore de réponse). */
const notifyAllowed = () => (window.vcConsent?.notifyChoice() ?? null) !== "denied";

/** Activer / tester / couper les notifications sur cet appareil (affiché seulement si ce n'est pas déjà fait). */
export function PushOptIn({ text }: { text: string }) {
  const [state, setState] = useState<PushState | "accepted" | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      let s = await pushState().catch((): PushState => "unsupported");
      // Déjà autorisé dans le navigateur (fenêtre d'autorisation) : on s'abonne tout seul, sans bouton.
      if (s === "off" && typeof Notification !== "undefined" && Notification.permission === "granted" && notifyAllowed()) {
        s = await enablePush().catch((): PushState => "off");
        if (s === "on") void sendWelcomePush().catch(() => undefined);
      }
      if (alive) setState(showPushBox(s, window.vcConsent?.notifyChoice() ?? null) ? s : "accepted");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    setInfo("");
    try {
      window.vcConsent?.saveNotify("granted");
      const s = await enablePush();
      setState(s);
      if (s === "on") {
        const { sent } = await sendTestPush();
        setInfo(sent ? "C’est activé : une notification d’essai vient d’être envoyée." : "C’est activé.");
      }
    } catch {
      setInfo("Activation impossible pour le moment. Réessayez.");
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    window.vcConsent?.saveNotify("denied");
    await disablePush().catch(() => undefined);
    setState("off");
    setInfo("Notifications coupées sur cet appareil.");
    setBusy(false);
  };

  // Rien à afficher quand c'est déjà accepté ou activé, ou quand ce navigateur ne peut rien faire.
  if (!state || state === "accepted" || state === "iframe" || state === "unsupported" || (state === "on" && !info)) return null;
  const on = state === "on";
  return (
    <Panel className="mb-5 flex flex-wrap items-center gap-4 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-soft text-primary">
        {on ? <BellRing className="size-5" /> : state === "denied" ? <BellOff className="size-5" /> : <Bell className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground">{on ? "Notifications activées sur cet appareil" : "Recevoir les notifications sur mon téléphone"}</p>
        <p className="text-sm text-muted-foreground">{info || HELP[state] || text}</p>
      </div>
      {state === "off" ? (
        <Button variant="brand" className="rounded-full" disabled={busy} onClick={enable}><Bell /> Activer</Button>
      ) : on ? (
        <Button variant="ghost" className="rounded-full" disabled={busy} onClick={disable}>Couper</Button>
      ) : null}
    </Panel>
  );
}
