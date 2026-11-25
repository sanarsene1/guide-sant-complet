import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Notifications : GET donne la clé publique, POST enregistre l'abonnement de cet appareil
 * pour la personne connectée (son propre jeton ; elle n'écrit que ses abonnements).
 * Appelé par public/site/assets/consent.js, sur toutes les pages.
 */
const Body = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
  time_zone: z.string().min(1).max(64),
});

export const Route = createFileRoute("/api/push-subscribe")({
  server: {
    handlers: {
      GET: async () => {
        const { vapidKeys } = await import("@/lib/push.server");
        return Response.json({ publicKey: vapidKeys().publicKey });
      },
      POST: async ({ request }) => {
        const token = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Server configuration error", { status: 500 });

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid body" }, { status: 400 });
        }

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient<import("@/integrations/supabase/types").Database>(url, key, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
        const uid = claims?.claims?.sub;
        if (authErr || !uid) return new Response("Unauthorized", { status: 401 });

        const { error } = await supabase
          .from("push_subscriptions")
          .upsert(
            { user_id: uid, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, time_zone: body.time_zone },
            { onConflict: "user_id,endpoint" },
          );
        if (error) {
          console.error(`push-subscribe failed: ${error.message}`);
          return Response.json({ error: error.message }, { status: 500 });
        }
        // Nouveau compte : message « Bienvenue sur VetoCare », une seule fois.
        const { data: who } = await supabase.auth.getUser(token);
        if (who.user) {
          const { sendWelcomeOnce } = await import("@/lib/push.server");
          await sendWelcomeOnce(supabase, who.user).catch((e) => console.error("welcome push failed", e));
        }
        return Response.json({ ok: true });
      },
    },
  },
});
