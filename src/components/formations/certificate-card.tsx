import { CERTIFICATE_SIGNER, certificateFields } from "@/lib/formations/certificate";
import type { ExamResult } from "@/lib/formations/grading";
import type { Course } from "@/lib/formations/types";
import { CERTIFICATE_DISCLAIMER } from "@/lib/legal";

/** Aperçu du brevet à l’écran : même mise en page que le PDF (A4 paysage), qui se réduit sur téléphone. */
export function CertificateCard({ course, exam, who }: { course: Course; exam: ExamResult; who: string }) {
  const f = certificateFields(course, exam, who);
  return (
    <figure
      aria-label={`Brevet VetoCare de ${f.name} pour la formation ${f.course}`}
      className="certificate-paper relative aspect-[297/210] w-full overflow-hidden rounded-xl bg-certificate text-certificate-foreground shadow-lg [container-type:inline-size]"
    >
      <div className="absolute inset-[3cqw] border-[0.5cqw] border-primary" />
      <div className="absolute inset-[4.3cqw] border-[0.15cqw] border-award" />
      {(["left-[2.2cqw] top-[2.2cqw]", "right-[2.2cqw] top-[2.2cqw]", "bottom-[2.2cqw] left-[2.2cqw]", "bottom-[2.2cqw] right-[2.2cqw]"] as const).map((pos) => (
        <span key={pos} className={`absolute ${pos} size-[3.2cqw] rotate-45 border-[0.4cqw] border-award bg-certificate`} aria-hidden="true" />
      ))}

      <div className="absolute inset-[6cqw] flex flex-col items-center text-center">
        <p className="font-display text-[3.4cqw] font-bold leading-none">Veto<span className="text-primary">Care</span></p>
        <p className="mt-[0.8cqw] text-[1.25cqw] font-semibold uppercase tracking-[0.3em] text-certificate-muted">Formation en santé animale</p>
        <p className="mt-[2.2cqw] text-[1.6cqw] font-bold uppercase tracking-[0.35em] text-award-foreground">Certificat de réussite</p>
        <p className="font-display text-[5.6cqw] font-bold leading-tight text-primary">Brevet</p>
        <p className="mt-[0.6cqw] text-[1.6cqw]">Ce brevet est décerné à</p>
        <p className="mt-[0.4cqw] max-w-[80%] truncate border-b-[0.15cqw] border-award px-[3cqw] pb-[0.4cqw] font-display text-[4.2cqw] font-bold italic leading-tight text-primary">{f.name}</p>
        <p className="mt-[1.2cqw] text-[1.6cqw]">pour avoir suivi et réussi la formation</p>
        <p className="mt-[0.4cqw] line-clamp-2 max-w-[78%] text-[2.2cqw] font-bold leading-snug">{f.course}</p>

        <div className="mt-[1.8cqw] flex items-stretch divide-x divide-award/40 rounded-[1cqw] border-[0.15cqw] border-award/50 text-[1.35cqw]">
          {[
            ["Mention", f.mention],
            ["Réussite", `${f.percent} %`],
          ].map(([k, v]) => (
            <div key={k} className="px-[2.2cqw] py-[0.7cqw]">
              <p className="uppercase tracking-wider text-certificate-muted">{k}</p>
              <p className="text-[1.9cqw] font-bold">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto grid w-full grid-cols-3 items-end text-[1.3cqw]">
          <div className="text-left">
            <p className="font-bold">{f.date}</p>
            <p className="border-t-[0.12cqw] border-certificate-muted/60 pt-[0.4cqw] text-certificate-muted">Date de délivrance</p>
            <p aria-hidden="true">&nbsp;</p>
          </div>
          <div className="flex justify-center" aria-hidden="true">
            <div className="grid size-[9cqw] place-items-center rounded-full bg-award p-[0.8cqw]">
              <div className="grid size-full place-items-center rounded-full border-[0.2cqw] border-dashed border-certificate bg-certificate text-award-foreground">
                <span className="text-[1.3cqw] font-bold leading-tight">RÉUSSI<br />{f.year}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <img src={CERTIFICATE_SIGNER.signature} alt="" aria-hidden="true" className="mx-auto -mb-[0.2cqw] block h-[3.9cqw] w-auto max-w-full" />
            <p className="border-t-[0.12cqw] border-certificate-muted/60 pt-[0.4cqw] font-bold">{f.signerName}</p>
            <p className="text-certificate-muted">{f.signerTitle}</p>
          </div>
        </div>
        <p className="mt-[0.8cqw] text-[1.05cqw] text-certificate-muted">N° {f.number} · {f.duration} · {CERTIFICATE_DISCLAIMER}</p>
      </div>
    </figure>
  );
}
