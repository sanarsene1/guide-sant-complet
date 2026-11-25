import { jsPDF } from "jspdf";
import { formatDuration, formatPlayedAt, noteOn10, percentOf, quizAdvice, type QuizAttempt } from "./quiz-history";

// Brand colors for the PDF (jsPDF needs RGB values, not CSS tokens).
const GREEN: [number, number, number] = [29, 94, 72];
const INK: [number, number, number] = [38, 48, 43];
const MUTED: [number, number, number] = [110, 122, 115];
const RED: [number, number, number] = [170, 52, 40];
const LINE: [number, number, number] = [220, 228, 223];

/** Standard PDF fonts only cover Latin-1: swap the few characters they lack. */
export const safe = (s: string) =>
  s
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/[^\x20-\x7e\u00a0-\u00ff\n]/g, "");

/** Quiz file name, distinct from the report card: vetocare-quiz-<n°>-<date>.pdf */
export function quizPdfName(a: Pick<QuizAttempt, "played_at">, num: number) {
  return `vetocare-quiz-${num}-${a.played_at.slice(0, 10)}.pdf`;
}

/** Builds the quiz result with its full correction as a PDF. */
export function buildQuizPdf(a: QuizAttempt, who: string, num: number): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 18;
  const maxW = W - M * 2;
  let y = 20;

  const ensure = (h: number) => {
    if (y + h > 280) {
      doc.addPage();
      y = 20;
    }
  };
  const write = (s: string, size: number, color: [number, number, number], style: "normal" | "bold" = "normal", indent = 0) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(safe(s), maxW - indent) as string[];
    const lh = size * 0.42;
    lines.forEach((line) => {
      ensure(lh);
      doc.text(line, M + indent, y);
      y += lh;
    });
  };

  // Header
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("Veto", M, y);
  doc.setTextColor(...GREEN);
  doc.text("Care", M + doc.getTextWidth("Veto"), y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(safe("Quiz vétérinaire - résultat et correction"), W - M, y, { align: "right" });
  y += 6;
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 10;

  write(`Quiz n° ${num}`, 18, GREEN, "bold");
  y += 1;
  write(`${a.species_label} · ${a.level_label}`, 13, INK, "bold");
  y += 1;
  write(`Date : ${formatPlayedAt(a.played_at)}${who ? `  ·  ${who}` : ""}`, 10, MUTED);
  y += 5;

  // Score box
  doc.setFillColor(238, 246, 241);
  doc.roundedRect(M, y, maxW, 22, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GREEN);
  const pct = percentOf(a.score, a.total);
  doc.text(`${String(noteOn10(a.score, a.total)).replace(".", ",")} / 10`, M + 6, y + 14);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(safe(`${pct} % de réussite  ·  ${a.score} bonne(s) réponse(s) sur ${a.total}`), M + 48, y + 9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(
    safe(`Temps : ${formatDuration(a.elapsed_seconds)} sur ${formatDuration(a.limit_seconds)}${a.timed_out ? " (temps écoulé)" : ""}`),
    M + 48,
    y + 16,
  );
  y += 30;

  write("Conseil", 11, INK, "bold");
  y += 0.5;
  write(quizAdvice(pct), 10.5, pct >= 50 ? GREEN : RED);
  y += 6;

  write("La correction", 14, INK, "bold");
  y += 3;

  a.questions.forEach((q, i) => {
    ensure(24);
    const ok = q.choice === q.correct;
    const status = q.choice === null ? "Sans réponse" : ok ? "Bonne réponse" : "À revoir";
    write(`Question ${i + 1} - ${status}`, 9, q.choice !== null && ok ? GREEN : RED, "bold");
    y += 0.5;
    write(q.q, 11.5, INK, "bold");
    y += 1.5;
    q.options.forEach((opt, k) => {
      const mark = k === q.correct ? "[juste]" : k === q.choice ? "[votre choix]" : "";
      const color = k === q.correct ? GREEN : k === q.choice ? RED : INK;
      write(`${"ABCDEFGH"[k]}. ${opt}${mark ? `  ${mark}` : ""}`, 10.5, color, k === q.correct ? "bold" : "normal", 4);
      y += 0.8;
    });
    y += 1;
    const letter = (k: number | null) => (k === null ? "" : `${"ABCDEFGH"[k]}. `);
    write(`Votre réponse : ${q.choice === null ? "aucune" : `${letter(q.choice)}${q.options[q.choice] ?? ""}`}`, 10, q.choice !== null && ok ? GREEN : RED, "bold", 4);
    write(`Bonne réponse : ${letter(q.correct)}${q.options[q.correct] ?? ""}`, 10, GREEN, "bold", 4);
    if (q.exp) {
      y += 1;
      write(`Explication : ${q.exp}`, 9.5, MUTED, "normal", 4);
    }
    y += 4;
    ensure(4);
    doc.setDrawColor(...LINE);
    doc.line(M, y - 2, W - M, y - 2);
    y += 2;
  });

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(safe("VetoCare · contenu éducatif, ne remplace pas l'avis d'un vétérinaire"), M, 290);
    doc.text(`${p} / ${pages}`, W - M, 290, { align: "right" });
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
