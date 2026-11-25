/** Moments des notifications d'un rappel de soin : à la création, la veille et le jour même
 *  (18 h la veille et 8 h le jour même, ou l'heure choisie par la personne pour les deux). */
import { addDays, localDate, localParts } from "./local-time";

export const EVE_HOUR = 18;
export const DAY_HOUR = 8;

export type ReminderForPush = { due_date: string; done: boolean; time_zone: string; notified_eve: boolean; notified_day: boolean; remind_hour?: number | null };

/** Quelle notification envoyer maintenant (au plus une par passage). */
export function reminderPushDue(r: ReminderForPush, now: Date): "eve" | "day" | null {
  if (r.done) return null;
  const today = localDate(now, r.time_zone);
  const h = localParts(now, r.time_zone).h;
  const custom = typeof r.remind_hour === "number" ? r.remind_hour : null;
  if (today === r.due_date && !r.notified_day && h >= (custom ?? DAY_HOUR)) return "day";
  if (today === addDays(r.due_date, -1) && !r.notified_eve && h >= (custom ?? EVE_HOUR)) return "eve";
  return null;
}

export function reminderPushText(title: string, petName: string | null, kind: "created" | "eve" | "day", due: string) {
  const who = petName ? ` pour ${petName}` : "";
  const date = new Date(`${due}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  if (kind === "created") return { title: "Rappel de soin enregistré", body: `${title}${who} : le ${date}. Nous vous préviendrons la veille et le jour même.` };
  if (kind === "eve") return { title: "Demain : rappel de soin", body: `${title}${who} est prévu demain (${date}).` };
  return { title: "Aujourd’hui : rappel de soin", body: `${title}${who} est prévu aujourd’hui.` };
}

/** Types proposés ; on peut aussi écrire son propre type (enregistré tel quel). */
export const REMINDER_KINDS: Record<string, string> = { vaccin: "Vaccin", vermifuge: "Vermifuge", visite: "Visite vétérinaire" };
export const reminderKindLabel = (kind: string) => REMINDER_KINDS[kind] ?? (kind === "autre" || !kind.trim() ? "Autre soin" : kind);
/** Texte de l'heure des notifications. */
export const reminderHourText = (h: number | null | undefined) =>
  typeof h === "number" ? `la veille et le jour même à ${h} h` : `la veille à ${EVE_HOUR} h et le jour même à ${DAY_HOUR} h`;
