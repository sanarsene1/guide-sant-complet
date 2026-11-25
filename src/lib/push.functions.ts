import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reminderPushText } from "./reminder-schedule";

/** Clé publique à donner au navigateur pour s'abonner. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const { vapidKeys } = await import("./push.server");
  return { publicKey: vapidKeys().publicKey };
});

async function sendToMe(
  supabase: SupabaseClient<Database>,
  payload: { title: string; body: string; url: string; tag?: string },
) {
  const { sendPush } = await import("./push.server");
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  let sent = 0;
  for (const s of subs ?? []) {
    const r = await sendPush(s, payload);
    if (r === "ok") sent++;
    if (r === "gone") await supabase.from("push_subscriptions").delete().eq("id", s.id);
  }
  return sent;
}

/** Notification immédiate à la création d'un rappel de soin. */
export const notifyReminderCreated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("pet_reminders").select("title, due_date, pet_id, pet_label").eq("id", data.id).maybeSingle();
    if (!r) return { sent: 0 };
    let pet: string | null = r.pet_label || null;
    if (r.pet_id) {
      const { data: p } = await context.supabase.from("pets").select("name").eq("id", r.pet_id).maybeSingle();
      pet = p?.name ?? null;
    }
    const sent = await sendToMe(context.supabase, { ...reminderPushText(r.title, pet, "created", r.due_date), url: "/mon-compte?tab=rappels", tag: `rappel-${data.id}` });
    return { sent };
  });

/** Bienvenue (nouveau compte, une seule fois) après l'abonnement de cet appareil. */
async function welcomeMe(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return 0;
  const { sendWelcomeOnce } = await import("./push.server");
  return sendWelcomeOnce(supabase, data.user);
}

/** Appelé quand l'appareil vient d'être abonné sans clic (autorisation déjà donnée). */
export const sendWelcomePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ sent: await welcomeMe(context.supabase) }));

/** Notification d'essai depuis Mon compte (remplacée par la bienvenue pour un nouveau compte). */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const welcomed = await welcomeMe(context.supabase);
    if (welcomed) return { sent: welcomed };
    const sent = await sendToMe(context.supabase, { title: "VetoCare", body: "Les notifications sont activées sur cet appareil.", url: "/mon-compte?tab=objectifs", tag: "test" });
    return { sent };
  });
