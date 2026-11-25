import { createFileRoute } from "@tanstack/react-router";

/**
 * Enregistre tout de suite, dans le compte, les quiz terminés sur le site statique
 * (public/site/assets/quiz.js). L'appelant envoie son jeton de connexion ; on écrit
 * avec ses droits (chacun ne peut écrire que ses propres quiz).
 */
export const Route = createFileRoute("/api/quiz-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = /^Bearer ([^\s]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return new Response("Server configuration error", { status: 500 });

        const { createClient } = await import("@supabase/supabase-js");
        const { splitPending } = await import("@/lib/quiz-history");
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}`, apikey: key } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
        const uid = claims?.claims?.sub;
        if (authErr || !uid) return new Response("Unauthorized", { status: 401 });

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const list = raw && typeof raw === "object" ? (raw as { attempts?: unknown }).attempts : null;
        const { mine } = splitPending(Array.isArray(list) ? list.slice(0, 30) : [], uid);
        if (!mine.length) return Response.json({ saved: [] });

        const rows = mine.map(({ uid: _u, ...q }) => ({ ...q, user_id: uid }));
        const { error } = await supabase.from("quiz_attempts").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) {
          console.error(`quiz-sync failed: ${error.message}`);
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ saved: mine.map((q) => q.id) });
      },
    },
  },
});
