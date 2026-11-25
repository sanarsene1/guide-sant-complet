import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

// Chaque maladie a une fiche détaillée : présentation, symptômes, causes, premiers gestes, prévention et photo.
const root = path.resolve(__dirname, "../../public/site");
const ctx: Record<string, unknown> = {};
vm.createContext(ctx);
vm.runInContext(
  `${readFileSync(path.join(root, "data/maladies.js"), "utf8")}\n${readFileSync(path.join(root, "data/maladies-fiches.js"), "utf8")}\n;this.MAL=MAL;this.FICHES=FICHES;`,
  ctx,
);
type Fiche = { d?: string[]; sy?: string[]; ca?: string[]; pg?: string[]; pr?: string[]; im?: string };
const MAL = ctx["MAL"] as { c: string; t: string }[];
const FICHES = ctx["FICHES"] as Record<string, Fiche>;
const fiche = (m: { c: string; t: string }) => FICHES[`${m.c}|${m.t}`] ?? {};

describe("Fiches maladies détaillées", () => {
  it("chaque maladie a une présentation d'au moins 2 paragraphes", () => {
    expect(MAL.filter((m) => (fiche(m).d?.length ?? 0) < 2).map((m) => m.t)).toEqual([]);
  });
  it("chaque maladie détaille au moins 5 symptômes et 4 causes", () => {
    expect(MAL.filter((m) => (fiche(m).sy?.length ?? 0) < 5 || (fiche(m).ca?.length ?? 0) < 4).map((m) => m.t)).toEqual([]);
  });
  it("chaque maladie a au moins 5 premiers gestes et 5 moyens de prévention", () => {
    expect(MAL.filter((m) => (fiche(m).pg?.length ?? 0) < 5 || (fiche(m).pr?.length ?? 0) < 5).map((m) => m.t)).toEqual([]);
  });
  it("chaque maladie a sa photo", () => {
    const bad = MAL.filter((m) => { const im = fiche(m).im; return !im || !existsSync(path.join(root, "assets/img/maladies", im)); });
    expect(bad.map((m) => m.t)).toEqual([]);
  });
});
