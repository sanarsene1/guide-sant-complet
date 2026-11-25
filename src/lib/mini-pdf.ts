/**
 * Petit générateur de PDF texte (A4, Helvetica), sans dépendance : il tourne aussi bien côté serveur
 * que dans le navigateur. Sert aux PDF envoyés par e-mail depuis le serveur.
 */
import { safe } from "./quiz-pdf";

type RGB = [number, number, number];
type TextOpts = { size?: number; bold?: boolean; color?: RGB; align?: "left" | "center" | "right" };

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const rgb = (c: RGB) => c.map((v) => (v / 255).toFixed(3)).join(" ");

/** Largeur approximative d’un texte en Helvetica (points). */
export function textWidth(s: string, size: number, bold = false) {
  let w = 0;
  for (const ch of s) {
    if ("il.,:;'|!".includes(ch)) w += 0.28;
    else if ("ftrjI ()".includes(ch)) w += 0.33;
    else if ("mwMW".includes(ch)) w += 0.85;
    else if (ch >= "A" && ch <= "Z") w += 0.68;
    else if (ch >= "0" && ch <= "9") w += 0.556;
    else w += 0.53;
  }
  return w * size * (bold ? 1.06 : 1);
}

export class MiniPdf {
  private pages: string[][] = [];
  private get ops() {
    return this.pages[this.pages.length - 1]!;
  }

  constructor() {
    this.addPage();
  }

  addPage() {
    this.pages.push([]);
  }

  /** Coupe un texte en lignes qui tiennent dans `maxW` points. */
  wrap(text: string, size: number, maxW: number, bold = false): string[] {
    const out: string[] = [];
    for (const para of safe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && textWidth(next, size, bold) > maxW) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    return out;
  }

  /** `y` est mesuré depuis le haut de la page (ligne de base du texte). */
  text(x: number, y: number, s: string, o: TextOpts = {}) {
    const size = o.size ?? 11;
    const t = safe(s);
    const w = textWidth(t, size, o.bold);
    const left = o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x;
    this.ops.push(`BT /${o.bold ? "F2" : "F1"} ${size} Tf ${rgb(o.color ?? [38, 48, 43])} rg ${left.toFixed(2)} ${(PAGE_H - y).toFixed(2)} Td (${esc(t)}) Tj ET`);
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB) {
    this.ops.push(`${rgb(fill)} rg ${x.toFixed(2)} ${(PAGE_H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.6) {
    this.ops.push(`${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${(PAGE_H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - y2).toFixed(2)} l S`);
  }

  /** Fichier PDF final (octets). */
  output(): Uint8Array {
    const objs: string[] = [];
    const n = this.pages.length;
    const pageIds = this.pages.map((_, i) => 5 + i * 2);
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${n} >>`;
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    this.pages.forEach((ops, i) => {
      const stream = ops.join("\n");
      objs[pageIds[i]!] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i]! + 1} 0 R >>`;
      objs[pageIds[i]! + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    let out = "%PDF-1.4\n";
    const offsets: number[] = [];
    for (let id = 1; id < objs.length; id++) {
      offsets[id] = out.length;
      out += `${id} 0 obj\n${objs[id]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objs.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    // Tout le texte est déjà ramené en Latin-1 par safe() : un caractère = un octet.
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}
