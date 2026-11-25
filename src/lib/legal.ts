/** Pages légales : les trois pages du site statique + la politique de cookies (page React). */
export const LEGAL_LINKS = [
  { href: "/site/politique-confidentialite.html", label: "Politique de confidentialité" },
  { href: "/site/mentions-legales.html", label: "Mentions légales" },
  { href: "/site/conditions.html", label: "Conditions d’utilisation" },
  { href: "/cookies", label: "Politique de cookies" },
] as const;

/** Avertissement affiché sur les pages maladies et conseils (plus dans les formations, à la demande du propriétaire). */
export const EDU_NOTICE = "Contenu éducatif : il ne remplace pas un vétérinaire. En cas d’urgence, contactez un vétérinaire.";

/** Mention obligatoire sur les brevets (rubrique Brevets et PDF). */
export const CERTIFICATE_DISCLAIMER = "Certificat de formation VetoCare, non diplômant officiel";
