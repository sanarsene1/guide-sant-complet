/** Where a visitor lands right after signing in or creating an account. */
export const HOME_AFTER_SIGN_IN = "/site/index.html";

export const DIAL_CODES = [
  { code: "+243", label: "RDC" },
  { code: "+242", label: "Congo" },
  { code: "+250", label: "Rwanda" },
  { code: "+257", label: "Burundi" },
  { code: "+256", label: "Ouganda" },
  { code: "+255", label: "Tanzanie" },
  { code: "+33", label: "France" },
  { code: "+32", label: "Belgique" },
] as const;

/**
 * Builds an international number (+243812345678) from a dial code and what the
 * visitor typed. A number typed with its own "+" prefix wins over the dial code;
 * the leading 0 of a national number is dropped. Returns null when it is not a
 * plausible phone number.
 */
export function toInternationalPhone(dialCode: string, typed: string): string | null {
  const raw = typed.trim();
  if (!raw) return null;
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const digits = raw.replace(/\D/g, "").replace(/^00/, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const national = raw.replace(/\D/g, "").replace(/^0+/, "");
  const full = dialCode.replace(/\D/g, "") + national;
  if (national.length < 6 || full.length > 15) return null;
  return `+${full}`;
}

/** Non-secret summary of the signed-in visitor, read by the static site's menu. */
export const ACCOUNT_CACHE_KEY = "vc-account";
export const AVATAR_COLOR_COUNT = 6;

export type AccountSummary = { id: string; name: string; initial: string; avatar: string | null; color: number };

/** Where a signed-in visitor manages their account (stats, quiz history, profile). */
export const ACCOUNT_HOME = "/mon-compte";

type UserLike = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

/**
 * Name shown in the menu: the name chosen in the profile (vc_name), else the sign-up
 * or Google name, else the part of the email before "@", else the phone.
 * Profile edits use vc_* keys because Google rewrites full_name/avatar_url at each sign-in.
 */
export function accountSummary(user: UserLike): AccountSummary {
  const meta = user.user_metadata ?? {};
  const fullName = str(meta["vc_name"]) || str(meta["full_name"]) || str(meta["name"]);
  const emailName = str(user.email).split("@")[0] ?? "";
  const phone = str(user.phone);
  const name = fullName || emailName || (phone ? `+${phone.replace(/^\+/, "")}` : "Mon compte");
  const letter = (fullName || emailName).match(/\p{L}|\d/u)?.[0] ?? "";
  const own = str(meta["vc_avatar"]);
  const avatar = own === "none" ? null : own || str(meta["avatar_url"]) || str(meta["picture"]) || null;
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return { id: str(user.id), name, initial: letter.toUpperCase() || "•", avatar, color: h % AVATAR_COLOR_COUNT };
}

/** First word of the name, used in the menu ("San" for "San Arsène"). */
export function shortName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** Message clair pour une erreur de changement d’email ou de mot de passe. */
export function authUpdateError(err: { message?: string | undefined; code?: string | undefined } | null | undefined, kind: "email" | "password"): string {
  const m = (err?.message || "").toLowerCase();
  const c = err?.code || "";
  if (c === "same_password" || m.includes("different from the old")) return "Le nouveau mot de passe doit être différent de l’ancien.";
  if (c === "weak_password" || (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("least") || m.includes("pwned"))))
    return "Choisissez un mot de passe plus sûr (8 caractères minimum, évitez les mots de passe trop courants).";
  if (c === "reauthentication_needed" || m.includes("reauthentic") || m.includes("session") || m.includes("jwt"))
    return "Pour votre sécurité, reconnectez-vous puis réessayez.";
  if (c === "email_exists" || m.includes("already been registered") || m.includes("already registered")) return "Cette adresse est déjà utilisée par un autre compte.";
  if (m.includes("rate limit") || c === "over_email_send_rate_limit") return "Trop de demandes. Patientez quelques minutes puis réessayez.";
  if (m.includes("fetch") || m.includes("network")) return "Connexion impossible. Vérifiez votre réseau puis réessayez.";
  return kind === "email" ? "Changement d’adresse impossible. Vérifiez qu’elle est bien écrite." : "Changement du mot de passe impossible. Réessayez.";
}

type KeyStorage = Pick<Storage, "getItem" | "key" | "length">;

/**
 * True when this device remembers a sign-in: the menu summary (vc-account) or a saved
 * session (sb-<projet>-auth-token). Without either, nobody is signed in here, so the
 * account page sends the visitor to sign in right away instead of retrying.
 */
export function signInRememberedOnDevice(storage: KeyStorage): boolean {
  try {
    if (storage.getItem(ACCOUNT_CACHE_KEY)) return true;
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch {
    /* stockage indisponible */
  }
  return false;
}

/** Délais entre les vérifications de session avant de conclure « pas connecté ». */
export const SESSION_RETRY_DELAYS_MS = [400, 1200] as const;

/**
 * Attentes avant de conclure « pas connecté ». Une connexion est mémorisée : on revérifie
 * (session en retard, jeton à renouveler). Rien de mémorisé : aucune attente, la page de
 * connexion s'ouvre tout de suite (utile sur réseau lent).
 */
export function sessionRetryDelays(remembered: boolean): readonly number[] {
  return remembered ? SESSION_RETRY_DELAYS_MS : [];
}
