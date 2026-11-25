/** Activation des notifications sur cet appareil (navigateur). */
import { supabase } from "@/integrations/supabase/client";
import { browserTimeZone } from "./local-time";
import { getPushPublicKey } from "./push.functions";

export type PushState = "unsupported" | "iframe" | "ios-install" | "denied" | "off" | "on";

const SW_URL = "/push-sw.js";
const SW_SCOPE = "/push-sw/";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (window.top !== window.self) return "iframe";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(b64u: string) {
  const s = atob(b64u.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64u.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** À appeler depuis un clic (le navigateur l'exige). */
export async function enablePush(): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "iframe" || state === "ios-install" || state === "denied") return state;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = (await registration()) ?? (await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE }));
  await navigator.serviceWorker.ready.catch(() => undefined);
  const { publicKey } = await getPushPublicKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, time_zone: browserTimeZone() }, { onConflict: "user_id,endpoint" });
  if (error) throw new Error(error.message);
  return "on";
}

export async function disablePush(): Promise<void> {
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
