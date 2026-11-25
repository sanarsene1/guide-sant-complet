/** Notification « Bienvenue sur VetoCare » : règles seules (testées dans notifications-rules.test.ts). */
import { shortName } from "./auth-helpers";

/** Un compte reçoit la bienvenue s'il a été créé il y a moins de 7 jours (les anciens comptes ne la reçoivent pas). */
export const WELCOME_WINDOW_DAYS = 7;

export function isNewAccount(createdAt: string | null | undefined, now: Date): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= WELCOME_WINDOW_DAYS * 86_400_000;
}

type Meta = Record<string, unknown> | null | undefined;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Prénom tiré du compte (nom choisi, puis nom Google), sinon rien. */
export function welcomeFirstName(meta: Meta): string | null {
  const m = meta ?? {};
  const full = str(m["vc_name"]) || str(m["full_name"]) || str(m["name"]);
  return full ? shortName(full) : null;
}

export function welcomePushText(firstName: string | null) {
  return {
    title: firstName ? `Bienvenue sur VetoCare, ${firstName} !` : "Bienvenue sur VetoCare !",
    body: "Votre compte est prêt. Commencez une formation ou testez-vous avec un quiz.",
    url: "/formations",
    tag: "bienvenue",
  };
}
