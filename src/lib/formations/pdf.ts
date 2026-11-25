import { jsPDF } from "jspdf";
import { safe } from "../quiz-pdf";
import { courseStatus, mention, EXAM_PASS_NOTE, type ChapterScores, type ExamResult } from "./grading";
import type { Course } from "./types";
import { certificateFields, CERTIFICATE_SIGNER } from "./certificate";
import { DIRECTOR_SIGNATURE_RATIO } from "./signature";
import { CERTIFICATE_DISCLAIMER } from "@/lib/legal";

// Couleurs de marque pour jsPDF (valeurs RVB, pas de jetons CSS).
const GREEN: [number, number, number] = [29, 94, 72];
const DEEP: [number, number, number] = [22, 58, 44];
const INK: [number, number, number] = [38, 48, 43];
const MUTED: [number, number, number] = [110, 122, 115];
const GOLD: [number, number, number] = [176, 135, 48];
const LINE: [number, number, number] = [220, 228, 223];
const GOLD_INK: [number, number, number] = [120, 88, 30];
const PAPER: [number, number, number] = [252, 250, 243];

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const certificatePdfName = (c: Course) => `vetocare-brevet-${slug(c.id)}.pdf`;

/** Brevet de formation VetoCare (A4 paysage), même mise en page que l’aperçu à l’écran (CertificateCard). */
export function buildCertificatePdf(course: Course, exam: ExamResult, who: string): Blob {
  const f = certificateFields(course, exam, who);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297;
  const H = 210;
  const cx = W / 2;
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, W, H, "F");
  // Double cadre vert et or, losanges dorés aux coins.
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.5);
  doc.rect(9, 9, W - 18, H - 18);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.45);
  doc.rect(12.8, 12.8, W - 25.6, H - 25.6);
  for (const [x, y] of [[9, 9], [W - 9, 9], [9, H - 9], [W - 9, H - 9]] as const) {
    doc.setFillColor(...PAPER);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.1);
    doc.lines([[5, 5], [-5, 5], [-5, -5], [5, -5]], x, y - 5, [1, 1], "FD", true);
  }

  const center = (t: string, y: number) => doc.text(safe(t), cx, y, { align: "center" });
  // Texte espacé centré : jsPDF ne compte pas l’espacement des lettres dans l’alignement.
  const spaced = (t: string, y: number, cs: number) => {
    const txt = safe(t);
    doc.setCharSpace(cs);
    doc.text(txt, cx - (doc.getTextWidth(txt) + cs * (txt.length - 1)) / 2, y);
    doc.setCharSpace(0);
  };
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...INK);
  const vw = doc.getTextWidth("Veto");
  const cw = doc.getTextWidth("Care");
  doc.text("Veto", cx - (vw + cw) / 2, 31);
  doc.setTextColor(...GREEN);
  doc.text("Care", cx - (vw + cw) / 2 + vw, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  spaced("FORMATION EN SANTÉ ANIMALE", 38, 1.2);
  doc.setFontSize(12);
  doc.setTextColor(...GOLD_INK);
  spaced("CERTIFICAT DE RÉUSSITE", 50, 2);

  doc.setFont("times", "bold");
  doc.setFontSize(46);
  doc.setTextColor(...GREEN);
  center("Brevet", 67);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  center("Ce brevet est décerné à", 77);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(34);
  doc.setTextColor(...GREEN);
  const name = doc.splitTextToSize(safe(f.name), 210)[0] as string;
  doc.text(name, cx, 91, { align: "center" });
  const nw = Math.min(220, doc.getTextWidth(name) + 20);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.45);
  doc.line(cx - nw / 2, 94, cx + nw / 2, 94);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  center("pour avoir suivi et réussi la formation", 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const title = (doc.splitTextToSize(safe(f.course), 230) as string[]).slice(0, 2);
  doc.text(title, cx, 112, { align: "center" });

  // Bandeau des résultats : mention, réussite.
  const cells: [string, string][] = [["MENTION", f.mention], ["RÉUSSITE", `${f.percent} %`]];
  const cellW = 46;
  const top = 112 + title.length * 7 + 2;
  const left = cx - (cells.length * cellW) / 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.35);
  doc.roundedRect(left, top, cells.length * cellW, 17, 2.5, 2.5);
  cells.forEach(([k, v], i) => {
    const x = left + i * cellW + cellW / 2;
    if (i) doc.line(left + i * cellW, top + 2, left + i * cellW, top + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(safe(k), x, top + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(safe(v), x, top + 13, { align: "center" });
  });

  // Pied : date, sceau, signature du directeur posée au-dessus du trait.
  const base = H - 37;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(safe(f.date), 30, base - 2);
  doc.line(30, base, 95, base);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(safe("Date de délivrance"), 30, base + 5);
  doc.line(W - 95, base, W - 30, base);
  const sigW = 24;
  const sigH = sigW * DIRECTOR_SIGNATURE_RATIO;
  doc.addImage(CERTIFICATE_SIGNER.signature, "PNG", W - 62.5 - sigW / 2, base - sigH + 1, sigW, sigH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(safe(f.signerName), W - 30, base + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(safe(f.signerTitle), W - 30, base + 9.5, { align: "right" });

  doc.setFillColor(...GOLD);
  doc.circle(cx, base - 8, 13, "F");
  doc.setFillColor(...PAPER);
  doc.circle(cx, base - 8, 10.5, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.circle(cx, base - 8, 9.3);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD_INK);
  doc.text(safe("RÉUSSI"), cx, base - 9, { align: "center" });
  doc.setFontSize(8);
  doc.text(f.year, cx, base - 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  center(`N° ${f.number}  ·  ${f.duration}  ·  ${course.chapters.length} chapitres`, H - 21);
  doc.setFontSize(7.5);
  center(`${CERTIFICATE_DISCLAIMER}. Ce document n’est pas un diplôme officiel ni un titre reconnu par l’État.`, H - 16.5);
  return doc.output("blob");
}

/** Bulletin de notes : chapitres validés et meilleure note d’examen de chaque formation commencée. */
export function buildReportPdf(
  courses: Course[],
  progress: Record<string, ChapterScores>,
  exams: ExamResult[],
  who: string,
): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  let y = 20;
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("Veto", M, y);
  doc.setTextColor(...GREEN);
  doc.text("Care", M + doc.getTextWidth("Veto"), y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(safe("Bulletin de notes des formations"), W - M, y, { align: "right" });
  y += 6;
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(safe(who || "Mon bulletin"), M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(safe(`Édité le ${day(new Date().toISOString())} · brevet à partir de ${EXAM_PASS_NOTE}/20`), M, y);
  y += 10;

  const rows = courses
    .map((c) => ({ c, s: courseStatus(c, progress[c.id], exams) }))
    .filter((r) => r.s.started || r.s.bestExam);
  doc.setFillColor(238, 246, 241);
  doc.rect(M, y - 5, W - 2 * M, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...DEEP);
  doc.text("Formation", M + 2, y);
  doc.text("Chapitres", 118, y);
  doc.text("Examen", 145, y);
  doc.text("Mention", 168, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  if (!rows.length) {
    doc.setTextColor(...MUTED);
    doc.text(safe("Aucune formation commencée pour le moment."), M + 2, y);
  }
  rows.forEach(({ c, s }) => {
    if (y > 272) {
      doc.addPage();
      y = 22;
    }
    const lines = doc.splitTextToSize(safe(c.title), 92) as string[];
    doc.setTextColor(...INK);
    doc.text(lines, M + 2, y);
    doc.text(`${s.chaptersDone} / ${s.chaptersTotal}`, 118, y);
    doc.text(s.bestExam ? `${String(s.bestExam.note).replace(".", ",")} / 20` : "-", 145, y);
    doc.setTextColor(...(s.passed ? GREEN : MUTED));
    doc.text(safe(s.bestExam ? mention(s.bestExam.note) : "En cours"), 168, y);
    y += lines.length * 4.6 + 3;
    doc.setDrawColor(...LINE);
    doc.line(M, y - 3, W - M, y - 3);
    y += 2;
  });
  const passed = rows.filter((r) => r.s.passed);
  const graded = rows.filter((r) => r.s.bestExam);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  const avg = graded.length ? graded.reduce((t, r) => t + (r.s.bestExam?.note ?? 0), 0) / graded.length : 0;
  doc.text(safe(`Brevets obtenus : ${passed.length} · Moyenne des examens : ${graded.length ? avg.toFixed(1).replace(".", ",") + " / 20" : "-"}`), M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(safe("VetoCare · contenu éducatif, ne remplace pas l'avis d'un vétérinaire"), M, 290);
  return doc.output("blob");
}
