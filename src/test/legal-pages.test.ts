import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CERTIFICATE_DISCLAIMER, EDU_NOTICE, LEGAL_LINKS } from "@/lib/legal";

const site = (f: string) => resolve(__dirname, "../../public/site", f);
const PAGES = ["index", "a-propos", "animaux", "maladies", "conseils", "quiz", "politique-confidentialite", "mentions-legales", "conditions"];
const LEGAL = ["politique-confidentialite.html", "mentions-legales.html", "conditions.html"];

describe("pages légales", () => {
  it("les trois pages légales existent dans le site statique", () => {
    for (const f of LEGAL) expect(existsSync(site(f)), f).toBe(true);
  });

  it("le pied de page de chaque page du site renvoie vers les trois pages légales", () => {
    for (const p of PAGES) {
      const html = readFileSync(site(`${p}.html`), "utf8");
      const footer = html.slice(html.indexOf('<footer class="ft"'));
      for (const f of LEGAL) expect(footer, `${p} → ${f}`).toContain(`href="${f}"`);
    }
  });

  it("l'application renvoie vers les trois pages légales", () => {
    const hrefs = LEGAL_LINKS.map((l) => l.href);
    for (const f of LEGAL) expect(hrefs).toContain(`/site/${f}`);
  });

  it("les pages maladies et conseils affichent l'avertissement vétérinaire", () => {
    for (const p of ["maladies", "conseils"]) {
      const html = readFileSync(site(`${p}.html`), "utf8");
      expect(html, p).toContain("Contenu éducatif : il ne remplace pas un vétérinaire.");
      expect(html, p).toContain("En cas d’urgence, contactez un vétérinaire.");
    }
    expect(EDU_NOTICE).toBe("Contenu éducatif : il ne remplace pas un vétérinaire. En cas d’urgence, contactez un vétérinaire.");
  });

  it("les brevets portent la mention non diplômante", () => {
    expect(CERTIFICATE_DISCLAIMER).toBe("Certificat de formation VetoCare, non diplômant officiel");
    expect(readFileSync(site("conditions.html"), "utf8")).toContain("pas un titre reconnu par l’État");
  });

  it("les mentions légales donnent l'e-mail de contact et l'hébergeur Cloudflare", () => {
    const html = readFileSync(site("mentions-legales.html"), "utf8");
    expect(html).toContain("vetocare@mysanarsene.com");
    expect(html).toContain("Cloudflare");
  });

  it("les mentions légales nomment l'éditeur : VetoCare, projet indépendant", () => {
    const html = readFileSync(site("mentions-legales.html"), "utf8");
    expect(html).toContain("VetoCare, projet éducatif indépendant");
  });
});
