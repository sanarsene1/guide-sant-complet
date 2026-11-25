/** Champs du brevet, partagés par l’aperçu à l’écran et le PDF pour qu’ils disent la même chose. */
import { certificateNumber, durationLabel, mention, quizPercent, type ExamResult } from "./grading";
import type { Course } from "./types";
import { DIRECTOR_SIGNATURE_PNG } from "./signature";

/** Signataire du brevet. `signature` : image PNG transparente de la signature du directeur. */
export const CERTIFICATE_SIGNER = {
  name: "Samuel Muhitwa Samuel",
  title: "Directeur de VetoCare",
  signature: DIRECTOR_SIGNATURE_PNG,
} as const;

export type CertificateFields = {
  name: string;
  course: string;
  mention: string;
  percent: number;
  duration: string;
  date: string;
  year: string;
  number: string;
  signerName: string;
  signerTitle: string;
};

export function certificateFields(course: Course, exam: ExamResult, who: string): CertificateFields {
  return {
    name: who.trim() || "Apprenant VetoCare",
    course: course.title,
    mention: mention(exam.note),
    percent: quizPercent(exam.score, exam.total),
    duration: durationLabel(course.hours),
    date: new Date(exam.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    year: exam.created_at.slice(0, 4),
    number: certificateNumber(exam),
    signerName: CERTIFICATE_SIGNER.name,
    signerTitle: CERTIFICATE_SIGNER.title,
  };
}
