import type { ChapterVideo } from "./types";

/** Vidéos YouTube vérifiées, par formation puis par chapitre. Lues sur place, sans recherche YouTube. */
export const VIDEOS: Record<string, Record<string, ChapterVideo>> = {
  "premiers-secours": {
    c3: { id: "K5p3cUOPhTw", title: "Les gestes de premiers secours sur un chien", source: "Generali France" },
  },
  volailles: {
    c2: { id: "XIc3gZmMIOw", title: "Reconnaître les symptômes de la maladie de Newcastle", source: "Africa Breeding" },
  },
  porcs: {
    c2: { id: "TGji23qETsE", title: "La peste porcine africaine, un fléau pour les élevages", source: "euronews (en français)" },
  },
  "lapins-cobayes": {
    c3: {
      id: "LWmLe3YcpGQ",
      title: "Castration d’un cobaye par un vétérinaire",
      source: "Dr Philippe Vanhée, vétérinaire",
      note: "Images de chirurgie. Cette opération se fait uniquement chez le vétérinaire, sous anesthésie : ne la tentez jamais vous-même.",
    },
  },
  "zoonoses-rage": {
    c2: { id: "-0yQjFE-Chc", title: "La rage expliquée par l’Institut Pasteur", source: "Institut Pasteur" },
  },
  reproduction: {
    c3: { id: "2Ylm0Kid-ns", title: "Les premiers soins au chevreau", source: "Simagri" },
  },
  pisciculture: {
    c2: { id: "DGJ6h3rmt0g", title: "Quelle densité pour un étang de tilapias ?", source: "Réussir l’Élevage en Afrique" },
    c3: { id: "rxBV9KnbRC4", title: "Prévenir les maladies chez le tilapia", source: "Afric Aqua+" },
  },
};
