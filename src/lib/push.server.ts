/** Envoi des notifications (Web Push standard, clés VAPID dérivées du secret VAPID_SEED). Serveur uniquement. */
import { p256 } from "@noble/curves/nist.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { buildPushHTTPRequest } from "@pushforge/builder";

const b64u = (u: Uint8Array) => {
  let s = "";
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

let cached: { publicKey: string; jwk: JsonWebKey } | null = null;

export function vapidKeys() {
  if (cached) return cached;
  const seed = process.env["VAPID_SEED"];
  if (!seed) throw new Error("VAPID_SEED manquant");
  const d = p256.utils.randomSecretKey(sha512(new TextEncoder().encode(seed)).slice(0, 48));
  const pub = p256.getPublicKey(d, false);
  cached = {
    publicKey: b64u(pub),
    jwk: { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: b64u(d) },
  };
  return cached;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** "gone" = abonnement expiré (à supprimer). */
export async function sendPush(sub: PushTarget, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  try {
    const { endpoint, headers, body } = await buildPushHTTPRequest({
      privateJWK: vapidKeys().jwk,
      subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      message: { payload, adminContact: "mailto:contact@vetocare.app", options: { ttl: 12 * 60 * 60, urgency: "high" } },
    });
    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error(`Push refusé [${res.status}]: ${await res.text()}`);
      return "error";
    }
    return "ok";
  } catch (e) {
    console.error("Push impossible", e);
    return "error";
  }
}

/**
 * Bienvenue, une seule fois par compte, dès que la personne a un appareil abonné.
 * `supabase` agit au nom de la personne (elle ne voit que ses abonnements et sa ligne de bienvenue).
 * Si aucun appareil n'a reçu le message, la ligne est retirée pour réessayer au prochain abonnement.
 */
export async function sendWelcomeOnce(
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>,
  user: { id: string; created_at?: string | null; user_metadata?: Record<string, unknown> | null },
): Promise<number> {
  const { isNewAccount, welcomeFirstName, welcomePushText } = await import("./welcome");
  if (!isNewAccount(user.created_at, new Date())) return 0;
  const { error } = await supabase.from("welcome_notices").insert({ user_id: user.id });
  if (error) return 0; // déjà envoyée (ou envoi en cours sur un autre appareil)
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  const payload = welcomePushText(welcomeFirstName(user.user_metadata));
  let sent = 0;
  for (const s of subs ?? []) {
    const r = await sendPush(s, payload);
    if (r === "ok") sent++;
    if (r === "gone") await supabase.from("push_subscriptions").delete().eq("id", s.id);
  }
  if (sent === 0) await supabase.from("welcome_notices").delete().eq("user_id", user.id);
  return sent;
}
