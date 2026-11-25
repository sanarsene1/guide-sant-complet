import { describe, expect, it } from "vitest";
import { HOME_AFTER_SIGN_IN, accountSummary, shortName, toInternationalPhone } from "@/lib/auth-helpers";

describe("connexion", () => {
  it("renvoie vers l'accueil du site après connexion", () => {
    expect(HOME_AFTER_SIGN_IN).toBe("/site/index.html");
  });

  it("ajoute l'indicatif et retire le 0 d'un numéro national", () => {
    expect(toInternationalPhone("+243", "081 234 5678")).toBe("+243812345678");
  });

  it("garde un numéro déjà écrit au format international", () => {
    expect(toInternationalPhone("+243", "+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("refuse un numéro trop court", () => {
    expect(toInternationalPhone("+243", "0812")).toBeNull();
  });
});

describe("compte dans le menu", () => {
  it("affiche la première lettre du nom quand il n'y a pas de photo", () => {
    const a = accountSummary({ email: "san@gmail.com", user_metadata: { full_name: "San Arsène" } });
    expect(a.initial).toBe("S");
    expect(a.avatar).toBeNull();
    expect(shortName(a.name)).toBe("San");
  });

  it("garde la photo du compte Google quand elle existe", () => {
    const a = accountSummary({ user_metadata: { name: "Kas Tsangya", avatar_url: "https://x.test/k.jpg" } });
    expect(a.avatar).toBe("https://x.test/k.jpg");
  });

  it("prend le début de l'email quand il n'y a pas de nom", () => {
    expect(accountSummary({ email: "fally490@gmail.com" }).name).toBe("fally490");
  });
});

import { authUpdateError } from "@/lib/auth-helpers";
describe("authUpdateError", () => {
  it("signale un mot de passe identique à l'ancien", () => {
    expect(authUpdateError({ code: "same_password" }, "password")).toContain("différent");
  });
  it("demande de se reconnecter si la session est trop ancienne", () => {
    expect(authUpdateError({ code: "reauthentication_needed" }, "password")).toContain("reconnectez-vous");
  });
  it("signale une adresse déjà utilisée", () => {
    expect(authUpdateError({ code: "email_exists" }, "email")).toContain("déjà utilisée");
  });
});
