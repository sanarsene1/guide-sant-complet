/** Thème clair / sombre des pages React (compte, connexion, formations). */
export const THEME_KEY = "vc-theme";
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** true quand le thème choisi (ou celui de l'appareil en mode automatique) est sombre. */
export function isDark(choice: ThemeChoice, systemDark: boolean): boolean {
  return choice === "dark" || (choice === "system" && systemDark);
}

export function applyTheme(choice: ThemeChoice) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = isDark(choice, systemDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function saveTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite */
  }
  applyTheme(choice);
}

/** Script lancé avant l'affichage, pour éviter un flash clair en mode sombre. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
