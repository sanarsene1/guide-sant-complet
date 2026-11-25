import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_DONATION, whatsappDonationUrl } from "@/lib/donation";

const siteDir = resolve(__dirname, "../../public/site");

describe("don par WhatsApp", () => {
  it("le lien ouvre WhatsApp vers le +243994531426 avec le message", () => {
    expect(whatsappDonationUrl("+243 994 531 426", "Bonjour, je veux faire un don")).toBe(
      "https://wa.me/243994531426?text=Bonjour%2C%20je%20veux%20faire%20un%20don",
    );
  });

  it("le numéro par défaut est le +243994531426", () => {
    expect(DEFAULT_DONATION.whatsappNumber).toBe("+243994531426");
  });

  it("l'ancienne page de don n'existe plus et aucun lien n'y mène", () => {
    expect(existsSync(resolve(siteDir, "soutien.html"))).toBe(false);
    for (const f of readdirSync(siteDir).filter((n) => n.endsWith(".html"))) {
      expect(readFileSync(resolve(siteDir, f), "utf8"), f).not.toContain("soutien.html");
    }
  });
});
