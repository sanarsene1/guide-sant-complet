import { describe, expect, it } from "vitest";
import { sessionRetryDelays, signInRememberedOnDevice } from "@/lib/auth-helpers";

function store(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return {
    getItem: (k: string) => entries[k] ?? null,
    key: (i: number) => keys[i] ?? null,
    length: keys.length,
  };
}

describe("ouverture de « Mon compte »", () => {
  it("personne connecté sur l'appareil : rien de mémorisé", () => {
    expect(signInRememberedOnDevice(store({ "vc-theme": "dark" }))).toBe(false);
  });

  it("le prénom mémorisé (vc-account) compte comme une connexion", () => {
    expect(signInRememberedOnDevice(store({ "vc-account": '{"name":"Sara"}' }))).toBe(true);
  });

  it("une session enregistrée compte comme une connexion", () => {
    expect(signInRememberedOnDevice(store({ "sb-abc-auth-token": "{}" }))).toBe(true);
  });

  it("sans connexion mémorisée, la page de connexion s'ouvre sans attendre", () => {
    expect(sessionRetryDelays(false)).toEqual([]);
  });

  it("avec une connexion mémorisée, la session est revérifiée avant de renvoyer à la connexion", () => {
    expect(sessionRetryDelays(true)).toEqual([400, 1200]);
  });
});
