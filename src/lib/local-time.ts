/** Heure locale d'une personne (fuseau IANA, ex. Africa/Kinshasa), sans dépendance au fuseau du serveur. */
export const DEFAULT_TZ = "Africa/Kinshasa";

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export type LocalParts = { y: number; m: number; d: number; h: number; mi: number; s: number; weekday: number };

function safeTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** weekday : 0 = lundi … 6 = dimanche. */
export function localParts(date: Date, tz: string): LocalParts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(date)) p[part.type] = part.value;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    y: Number(p["year"]),
    m: Number(p["month"]),
    d: Number(p["day"]),
    h: Number(p["hour"]) % 24,
    mi: Number(p["minute"]),
    s: Number(p["second"]),
    weekday: Math.max(0, days.indexOf(p["weekday"] ?? "Mon")),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date locale « AAAA-MM-JJ ». */
export function localDate(date: Date, tz: string): string {
  const p = localParts(date, tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Décale une date « AAAA-MM-JJ » de n jours. */
export function addDays(iso: string, n: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Instant (UTC) correspondant à minuit local du jour « AAAA-MM-JJ ». */
export function localMidnight(iso: string, tz: string): Date {
  const guess = Date.parse(`${iso}T00:00:00Z`);
  const p = localParts(new Date(guess), tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return new Date(guess - (asUtc - guess));
}
