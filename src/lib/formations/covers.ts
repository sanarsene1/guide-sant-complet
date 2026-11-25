/** Photo de couverture de chaque formation (images déjà présentes dans le site). */
const C = "/site/assets/img/conseils/";
const COVERS: Record<string, string> = {
  "auxiliaire-veterinaire": "/site/assets/img/animal-companion-640.webp",
  "bien-etre": C + "chevaux.webp",
  biosecurite: C + "poules.webp",
  bovins: C + "bovins.webp",
  "chevres-moutons": C + "chevres.webp",
  epidemiologie: "/site/assets/img/maladies-hero-640.webp",
  "gestion-elevage": C + "moutons.webp",
  "lapins-cobayes": C + "lapins.webp",
  "nutrition-chien-chat": C + "chats.webp",
  parasites: C + "chiens.webp",
  pharmacologie: "/site/assets/img/discover-advice-560.webp",
  pisciculture: C + "poissons.webp",
  porcs: C + "porcs.webp",
  "premiers-secours": "/site/assets/img/dogs-walk-640.webp",
  reproduction: C + "cobayes.webp",
  "signes-maladie": "/site/assets/img/discover-maladies-560.webp",
  "soins-infirmiers": C + "general.webp",
  "vaccination-compagnie": C + "chiens.webp",
  volailles: C + "canards.webp",
  "zoonoses-rage": C + "autres.webp",
};
export const courseCover = (id: string) => COVERS[id] ?? C + "general.webp";
