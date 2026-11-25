/** Catégories d'animaux et espèces proposées dans chacune. */
export const PET_CATEGORIES = {
  compagnie: { label: "Animaux de compagnie", species: ["Chien", "Chat", "Lapin", "Cobaye", "Hamster", "Perroquet", "Tortue", "Autre"] },
  elevage: { label: "Animaux d’élevage", species: ["Chèvre", "Mouton", "Porc", "Vache", "Lapin", "Cheval", "Âne", "Autre"] },
  volailles: { label: "Volailles", species: ["Poule", "Canard", "Dinde", "Pintade", "Oie", "Caille", "Autre"] },
  poissons: { label: "Poissons", species: ["Tilapia", "Clarias (poisson-chat)", "Carpe", "Poisson d’ornement", "Autre"] },
} as const;

export type PetCategory = keyof typeof PET_CATEGORIES;
export const PET_CATEGORY_KEYS = Object.keys(PET_CATEGORIES) as PetCategory[];

/** Catégorie d'un animal enregistré avant l'ajout des catégories, d'après son espèce. */
export function petCategoryOf(category: string, species: string): PetCategory {
  if (category in PET_CATEGORIES) return category as PetCategory;
  const s = species.toLowerCase();
  if (["poule", "canard", "dinde", "pintade", "oie", "caille"].some((x) => s.includes(x))) return "volailles";
  if (["poisson", "tilapia", "clarias", "carpe"].some((x) => s.includes(x))) return "poissons";
  if (["chèvre", "mouton", "porc", "vache", "cheval", "âne"].some((x) => s.includes(x))) return "elevage";
  return "compagnie";
}
