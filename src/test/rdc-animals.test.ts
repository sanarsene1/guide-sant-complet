import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// Charge les fichiers de données du site (scripts « const X=[...] ») et le dictionnaire CAT.
const root = path.resolve(__dirname, "../../public/site");
const ctx: Record<string, unknown> = {};
vm.createContext(ctx);
const load = (file: string, names: string[]) => {
  const src = readFileSync(path.join(root, file), "utf8");
  vm.runInContext(`${src}\n;${names.map((n) => `this.${n}=${n};`).join("")}`, ctx);
};
load("data/maladies.js", ["MAL"]);
load("data/quiz.js", ["QUIZ"]);
load("data/conseils.js", ["CONS"]);
load("data/animaux.js", ["ANIMAUX"]);
const appSrc = readFileSync(path.join(root, "assets/app.js"), "utf8");
const catLine = appSrc.match(/const CAT=\{.*?\};/)?.[0] ?? "";
vm.runInContext(`${catLine};this.CAT=CAT;`, ctx);

type Row = { c?: string; categorie?: string; t?: string; nom?: string; key?: string; rdc?: boolean };
const MAL = ctx["MAL"] as Row[];
const QUIZ = ctx["QUIZ"] as Row[];
const CONS = ctx["CONS"] as Row[];
const ANIMAUX = ctx["ANIMAUX"] as Row[];
const CAT = ctx["CAT"] as Record<string, string>;

const RDC = [
  ["poules", "Poules", "Poule"],
  ["chevres", "Chèvres", "Chèvre"],
  ["chiens", "Chiens", "Chien"],
  ["porcs", "Porcs", "Porc"],
  ["moutons", "Moutons", "Mouton"],
  ["bovins", "Bovins", "Bovin"],
  ["canards", "Canards", "Canard"],
  ["lapins", "Lapins", "Lapin"],
  ["chats", "Chats", "Chat"],
  ["cobayes", "Cobayes", "Cobaye"],
] as const;

describe("Les 10 animaux les plus élevés en RDC sont présents partout", () => {
  for (const [key, label, nom] of RDC) {
    it(`${label} : nom affiché, maladies, quiz, conseils et fiche`, () => {
      expect(CAT[key]).toBe(label);
      expect(MAL.filter((m) => m.c === key).length).toBeGreaterThanOrEqual(10);
      expect(QUIZ.filter((q) => q.categorie === key).length).toBeGreaterThanOrEqual(15);
      expect(CONS.filter((x) => x.c === key).length).toBeGreaterThanOrEqual(2);
      expect(ANIMAUX.some((a) => a.nom === nom && a.rdc === true)).toBe(true);
    });
  }

  it("les fiches animaux commencent par les 10 animaux, dans l'ordre demandé", () => {
    expect(ANIMAUX.slice(0, 10).map((a) => a.nom)).toEqual(RDC.map(([, , nom]) => nom));
  });
});

describe("Plus de groupes « petits ruminants », « volailles » ou « équidés »", () => {
  it("aucune catégorie de groupe n'est utilisée", () => {
    const used = new Set([...MAL.map((m) => m.c), ...QUIZ.map((q) => q.categorie), ...CONS.map((x) => x.c)]);
    for (const old of ["volailles", "ruminants", "petits-ruminants", "equides"]) expect(used.has(old)).toBe(false);
  });

  it("aucun libellé de groupe n'est affiché", () => {
    const labels = Object.values(CAT);
    for (const old of ["Petits ruminants", "Volailles", "Équidés"]) expect(labels).not.toContain(old);
  });
});

describe("Conseils : chaque fiche est complète et filtrable", () => {
  const src = readFileSync(path.join(root, "data/conseils.js"), "utf8");
  const c2: Record<string, unknown> = {};
  vm.createContext(c2);
  vm.runInContext(`${src}\n;this.THEMES=THEMES;this.CONS=CONS;`, c2);
  const THEMES = c2["THEMES"] as Record<string, string>;
  const ALL = c2["CONS"] as { c: string; th: string; t: string; r: string; g: string[]; a: string }[];

  it("chaque conseil a une espèce connue, un thème, des gestes et un signe d'alerte", () => {
    for (const x of ALL) {
      expect(CAT[x.c], x.t).toBeDefined();
      expect(THEMES[x.th], x.t).toBeDefined();
      expect(x.g.length, x.t).toBeGreaterThanOrEqual(2);
      expect(x.a.length, x.t).toBeGreaterThan(10);
    }
  });

  it("aucun titre de conseil n'est en double pour une même espèce", () => {
    const keys = ALL.map((x) => `${x.c}|${x.t}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
