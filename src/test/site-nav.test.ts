import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Le menu du site est dupliqué dans chaque page ; le hamburger mobile et les
// 5 onglets du bas sont construits à partir de ce même <nav id="nav">.
const root = path.resolve(__dirname, "../../public/site");
const pages = readdirSync(root)
  .filter((f) => f.endsWith(".html"))
  .sort();

const navOf = (page: string) => {
  const src = readFileSync(path.join(root, page), "utf8");
  return src.match(/<nav id="nav">[\s\S]*?<\/nav>/)?.[0] ?? "";
};

const appSrc = readFileSync(path.join(root, "assets/app.js"), "utf8");
const styleSrc = readFileSync(path.join(root, "assets/style.css"), "utf8");

describe("menu mobile : hamburger et onglets du bas", () => {
  it("toutes les pages ont un menu", () => {
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) expect(navOf(p), p).not.toBe("");
  });

  it("« Animaux » est marqué pour rester dans les onglets du bas", () => {
    for (const p of pages) {
      expect(navOf(p), p).toContain('<a href="animaux.html" data-mob="tab"');
    }
  });

  it("« Animaux » est masqué dans le panneau du hamburger", () => {
    expect(styleSrc).toMatch(/nav \[data-mob="tab"\]\{display:none\}/);
  });

  it("le hamburger contient le lien « Mon compte »", () => {
    for (const p of pages) {
      const nav = navOf(p);
      expect(nav, p).toContain('data-mob="menu"');
      expect(nav, p).toContain("<span>Mon compte</span>");
      expect(nav, p).toContain('href="/espace-veterinaire"');
    }
  });

  it("« Mon compte » ne rejoint pas les 5 onglets du bas", () => {
    const filter = appSrc.match(/n\.querySelectorAll\('([^']+)'\)/)?.[1] ?? "";
    expect(filter).toContain(':not([data-mob="menu"])');
    expect(filter).toContain(":not([data-p])");
    expect(filter).toContain(":not([data-about])");
  });

  it("« Mon compte » mène toujours directement à l’espace compte (/mon-compte)", () => {
    expect(appSrc).toContain("l.setAttribute('href','/mon-compte')");
    expect(appSrc).not.toContain("'/mon-compte':'/espace-veterinaire'");
  });
});
