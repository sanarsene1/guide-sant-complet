/** Quand afficher le bloc « Recevoir les notifications sur mon téléphone » (règle seule, testée). */
export type PushBoxState = "unsupported" | "iframe" | "ios-install" | "denied" | "off" | "on";

/**
 * Le bloc reste caché si les notifications sont déjà actives, si la personne a déjà dit oui
 * (fenêtre des cookies ou bouton Activer), ou si ce navigateur ne peut rien en faire.
 */
export function showPushBox(state: PushBoxState, choice: "granted" | "denied" | null): boolean {
  if (state === "on" || choice === "granted") return false;
  return state !== "iframe" && state !== "unsupported";
}
