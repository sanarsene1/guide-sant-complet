import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { courseById } from "./formations";
import { FEEDBACK_RECIPIENT, feedbackComplete, feedbackQuestions, type FeedbackAnswers } from "./formations/feedback";
import { buildFeedbackPdf, feedbackPdfName } from "./formations/feedback-pdf";
import { accountSummary } from "./auth-helpers";

/**
 * Envoie en PDF, une seule fois, l’avis que la personne connectée vient d’enregistrer pour cette formation.
 * Appelé en arrière-plan par la page du cours : l’apprenant n’attend pas l’envoi.
 */
export const emailCourseFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ courseId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const course = courseById(data.courseId);
    if (!course) return { sent: false };
    const { data: row } = await context.supabase
      .from("course_feedback")
      .select("answers, comment, created_at, emailed_at")
      .eq("course_id", course.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    const questions = feedbackQuestions(course);
    const answers = (row?.answers ?? {}) as FeedbackAnswers;
    if (!row || row.emailed_at || !feedbackComplete(questions, answers)) return { sent: false };

    // Réserve l’envoi (une seule fois par avis) ; la date d’envoi n’est modifiable que par le serveur.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed } = await supabaseAdmin
      .from("course_feedback")
      .update({ emailed_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("course_id", course.id)
      .is("emailed_at", null)
      .select("user_id");
    if (!claimed?.length) return { sent: false };

    try {
      const { data: u } = await context.supabase.auth.getUser();
      const name = u.user ? accountSummary(u.user).name : "Apprenant";
      const email = u.user?.email ?? "";
      const yes = questions.filter((q) => answers[q.id] === true).length;
      const pdf = buildFeedbackPdf({ courseTitle: course.title, learnerName: name, learnerEmail: email, date: row.created_at, questions, answers, comment: row.comment });
      const { sendGmail } = await import("./gmail.server");
      await sendGmail({
        to: FEEDBACK_RECIPIENT,
        subject: `Avis VetoCare · ${course.title} · ${name}`,
        text: [
          `Nouvel avis de fin de formation sur VetoCare.`,
          ``,
          `Formation : ${course.title}`,
          `Apprenant : ${name}${email ? ` (${email})` : ""}`,
          `Résumé : ${yes} Oui · ${questions.length - yes} Non`,
          ``,
          ...questions.map((q, i) => `${i + 1}. ${q.q} → ${answers[q.id] ? "Oui" : "Non"}`),
          ``,
          `Que devrions-nous améliorer ? ${row.comment.trim() || "(pas de remarque)"}`,
          ``,
          `Le détail est dans le PDF joint.`,
        ].join("\n"),
        attachment: { filename: feedbackPdfName(course.id, row.created_at), mime: "application/pdf", bytes: pdf },
      });
      return { sent: true };
    } catch (e) {
      console.error("Feedback email failed", e);
      await supabaseAdmin.from("course_feedback").update({ emailed_at: null }).eq("user_id", context.userId).eq("course_id", course.id);
      return { sent: false };
    }
  });
