/** PDF de l’avis de fin de formation, envoyé par e-mail au responsable de VetoCare. */
import { MiniPdf, PAGE_H, PAGE_W } from "../mini-pdf";
import type { FeedbackAnswers, FeedbackQuestion } from "./feedback";

const GREEN: [number, number, number] = [29, 94, 72];
const MUTED: [number, number, number] = [110, 122, 115];
const LINE: [number, number, number] = [220, 228, 223];
const SOFT: [number, number, number] = [238, 246, 241];
const NO: [number, number, number] = [150, 60, 40];

export type FeedbackReport = {
  courseTitle: string;
  learnerName: string;
  learnerEmail: string;
  date: string;
  questions: FeedbackQuestion[];
  answers: FeedbackAnswers;
  comment: string;
};

export const feedbackPdfName = (courseId: string, date: string) => `avis-vetocare-${courseId}-${date.slice(0, 10)}.pdf`;

export function buildFeedbackPdf(r: FeedbackReport): Uint8Array {
  const pdf = new MiniPdf();
  const M = 50;
  const W = PAGE_W - 2 * M;
  let y = 60;
  const ensure = (h: number) => {
    if (y + h > PAGE_H - 50) {
      pdf.addPage();
      y = 60;
    }
  };

  pdf.text(M, y, "Veto", { size: 22, bold: true });
  pdf.text(M + 50, y, "Care", { size: 22, bold: true, color: GREEN });
  pdf.text(PAGE_W - M, y, "Avis de fin de formation", { size: 10, color: MUTED, align: "right" });
  y += 12;
  pdf.line(M, y, PAGE_W - M, y, LINE);
  y += 28;

  for (const l of pdf.wrap(r.courseTitle, 16, W, true)) {
    pdf.text(M, y, l, { size: 16, bold: true });
    y += 20;
  }
  y += 4;
  const yes = r.questions.filter((q) => r.answers[q.id] === true).length;
  const info: [string, string][] = [
    ["Apprenant", r.learnerName],
    ["E-mail", r.learnerEmail || "-"],
    ["Date", new Date(r.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Kinshasa" })],
    ["Résumé", `${yes} Oui · ${r.questions.length - yes} Non`],
  ];
  pdf.rect(M, y - 4, W, info.length * 18 + 10, SOFT);
  y += 10;
  for (const [k, v] of info) {
    pdf.text(M + 12, y, k, { size: 10, color: MUTED });
    pdf.text(M + 100, y, v, { size: 11, bold: true });
    y += 18;
  }
  y += 20;

  pdf.text(M, y, "Réponses", { size: 13, bold: true, color: GREEN });
  y += 18;
  r.questions.forEach((q, i) => {
    const lines = pdf.wrap(`${i + 1}. ${q.q}`, 11, W - 70);
    ensure(lines.length * 15 + 10);
    lines.forEach((l, k) => pdf.text(M, y + k * 15, l, { size: 11 }));
    const a = r.answers[q.id];
    pdf.text(PAGE_W - M, y, a === true ? "OUI" : a === false ? "NON" : "-", { size: 11, bold: true, color: a === false ? NO : GREEN, align: "right" });
    y += lines.length * 15 + 4;
    pdf.line(M, y, PAGE_W - M, y, LINE, 0.4);
    y += 14;
  });

  y += 8;
  ensure(60);
  pdf.text(M, y, "Que devrions-nous améliorer ?", { size: 13, bold: true, color: GREEN });
  y += 18;
  for (const l of pdf.wrap(r.comment.trim() || "(pas de remarque)", 11, W)) {
    ensure(16);
    pdf.text(M, y, l, { size: 11, color: r.comment.trim() ? [38, 48, 43] : MUTED });
    y += 15;
  }
  pdf.text(M, PAGE_H - 30, "VetoCare · avis envoyé automatiquement à la fin de la formation", { size: 8, color: MUTED });
  return pdf.output();
}
