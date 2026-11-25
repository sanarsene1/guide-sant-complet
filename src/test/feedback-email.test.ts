import { describe, expect, it } from "vitest";
import { COURSES } from "@/lib/formations";
import { FEEDBACK_RECIPIENT, feedbackQuestions } from "@/lib/formations/feedback";
import { buildFeedbackPdf } from "@/lib/formations/feedback-pdf";
import { buildRawMail } from "@/lib/mail-mime";

const decode = (raw: string) => {
  const bin = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

describe("envoi des avis par e-mail", () => {
  it("envoie les avis à arsenenzanzu19@gmail.com", () => {
    expect(FEEDBACK_RECIPIENT).toBe("arsenenzanzu19@gmail.com");
  });

  it("joint l'avis en PDF au message", () => {
    const course = COURSES[0]!;
    const questions = feedbackQuestions(course);
    const answers = Object.fromEntries(questions.map((q) => [q.id, true]));
    const pdf = buildFeedbackPdf({
      courseTitle: course.title,
      learnerName: "Jean",
      learnerEmail: "jean@example.com",
      date: "2026-11-21T12:00:00Z",
      questions,
      answers,
      comment: "",
    });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    const mime = decode(
      buildRawMail({ to: FEEDBACK_RECIPIENT, subject: "Avis", text: "Bonjour", attachment: { filename: "avis.pdf", mime: "application/pdf", bytes: pdf } }),
    );
    expect(mime).toContain("To: arsenenzanzu19@gmail.com");
    expect(mime).toContain('Content-Type: application/pdf; name="avis.pdf"');
  });
});
