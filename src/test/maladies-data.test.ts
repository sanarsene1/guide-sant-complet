import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// La page Maladies affiche la cause (ty), la gravité (g), le résumé (r), « Que faire » (f) et « Prévenir » (p) de chaque fiche.
const root = path.resolve(__dirname, "../../public/site");
const ctx: Record<string, unknown> = {};
vm.createContext(ctx);
vm.runInContext(`${readFileSync(path.join(root, "data/maladies.js"), "utf8")}\n;this.MAL=MAL;`, ctx);
type Fiche = {
  t: string; c: string; a: string; s: string; ty: string; g: number; r: string;
  f: string[]; p: string[]; ct: boolean; z: boolean; v: boolean; o: boolean;
};
const MAL = ctx["MAL"] as Fiche[];
const TY = ["vir", "bac", "par", "fon", "nut", "org"];

describe("Fiches maladies au nouveau format", () => {
  it("chaque fiche a une cause reconnue", () => {
    expect(MAL.filter((m) => !TY.includes(m.ty)).map((m) => m.t)).toEqual([]);
  });
  it("chaque fiche a une gravité 1, 2 ou 3", () => {
    expect(MAL.filter((m) => ![1, 2, 3].includes(m.g)).map((m) => m.t)).toEqual([]);
  });
  it("chaque fiche peut s'ouvrir : résumé, que faire et prévenir remplis", () => {
    const bad = MAL.filter((m) => !m.r || !Array.isArray(m.f) || m.f.length < 2 || !Array.isArray(m.p) || m.p.length < 2);
    expect(bad.map((m) => m.t)).toEqual([]);
  });
  it("chaque fiche liste au moins 3 signes", () => {
    const bad = MAL.filter((m) => m.s.replace(/\.$/, "").split(/,\s*/).filter(Boolean).length < 3);
    expect(bad.map((m) => m.t)).toEqual([]);
  });
  it("aucun nom de maladie en double pour un même animal", () => {
    const keys = MAL.map((m) => `${m.c}|${m.t.toLowerCase()}`);
    expect(keys.length).toBe(new Set(keys).size);
  });
});
