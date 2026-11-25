import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Passage horaire : rappels d'objectifs (à l'heure choisie, si pas encore atteint),
 * objectif atteint (retiré + bravo), rappels de soin (veille 18 h, jour même 8 h).
 */
export const Route = createFileRoute("/api/public/jobs/push-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPush } = await import("@/lib/push.server");
        const { goalLink, goalProgress, goalReminderText, goalTitle, isGoalReached, shouldRemindGoal } = await import("@/lib/goals");
        const { reminderPushDue, reminderPushText } = await import("@/lib/reminder-schedule");
        const { localDate } = await import("@/lib/local-time");
        type ChapterScores = import("@/lib/formations/grading").ChapterScores;

        const now = new Date();
        const subsByUser = new Map<string, { id: string; endpoint: string; p256dh: string; auth: string }[]>();
        const { data: subs, error: subErr } = await supabaseAdmin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
        if (subErr) return Response.json({ error: subErr.message }, { status: 500 });
        for (const s of subs ?? []) subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);

        let sent = 0;
        const push = async (userId: string, payload: { title: string; body: string; url: string; tag?: string }) => {
          for (const s of subsByUser.get(userId) ?? []) {
            const r = await sendPush(s, payload);
            if (r === "ok") sent++;
            if (r === "gone") await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
          }
        };

        // Objectifs
        const { data: goals } = await supabaseAdmin.from("goals").select("*").is("achieved_at", null);
        const goalUsers = [...new Set((goals ?? []).map((g) => g.user_id))];
        const quizzesBy = new Map<string, { played_at: string }[]>();
        const progressBy = new Map<string, { chapter_scores: ChapterScores }[]>();
        if (goalUsers.length) {
          const since = new Date(now.getTime() - 8 * 86_400_000).toISOString();
          const { data: qs } = await supabaseAdmin.from("quiz_attempts").select("user_id, played_at").in("user_id", goalUsers).gte("played_at", since);
          for (const q of qs ?? []) quizzesBy.set(q.user_id, [...(quizzesBy.get(q.user_id) ?? []), q]);
          const { data: ps } = await supabaseAdmin.from("course_progress").select("user_id, chapter_scores").in("user_id", goalUsers);
          for (const p of ps ?? []) progressBy.set(p.user_id, [...(progressBy.get(p.user_id) ?? []), { chapter_scores: (p.chapter_scores ?? {}) as unknown as ChapterScores }]);
        }
        for (const g of goals ?? []) {
          const goal = { ...g, kind: g.kind as "quiz" | "chapter", period: g.period as "day" | "week" };
          const done = goalProgress(goal, quizzesBy.get(g.user_id) ?? [], progressBy.get(g.user_id) ?? [], now);
          if (isGoalReached(goal, done)) {
            await supabaseAdmin.from("goals").update({ achieved_at: now.toISOString() }).eq("id", g.id);
            await push(g.user_id, { title: "Objectif atteint, bravo !", body: `${goalTitle(goal)} : c’est fait.`, url: "/mon-compte?tab=objectifs", tag: `objectif-${g.id}` });
          } else if (shouldRemindGoal(goal, now)) {
            await supabaseAdmin.from("goals").update({ last_notified_on: localDate(now, g.time_zone) }).eq("id", g.id);
            await push(g.user_id, { ...goalReminderText(goal, done), url: goalLink(goal.kind), tag: `objectif-${g.id}` });
          }
        }

        // Rappels de soin
        const yesterday = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
        const { data: rems } = await supabaseAdmin
          .from("pet_reminders")
          .select("id, user_id, title, due_date, done, pet_id, pet_label, remind_hour, time_zone, notified_eve, notified_day")
          .eq("done", false)
          .gte("due_date", yesterday);
        const petIds = [...new Set((rems ?? []).map((r) => r.pet_id).filter((x): x is string => !!x))];
        const petNames = new Map<string, string>();
        if (petIds.length) {
          const { data: pets } = await supabaseAdmin.from("pets").select("id, name").in("id", petIds);
          for (const p of pets ?? []) petNames.set(p.id, p.name);
        }
        for (const r of rems ?? []) {
          const due = reminderPushDue(r, now);
          if (!due) continue;
          await supabaseAdmin
            .from("pet_reminders")
            .update(due === "day" ? { notified_day: true, notified_eve: true } : { notified_eve: true })
            .eq("id", r.id);
          await push(r.user_id, { ...reminderPushText(r.title, r.pet_id ? petNames.get(r.pet_id) ?? null : r.pet_label || null, due, r.due_date), url: "/mon-compte?tab=rappels", tag: `rappel-${r.id}` });
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
