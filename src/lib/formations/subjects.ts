import { COURSES, type Course } from "./index";

/** Sujets du catalogue (comme « Subjects » chez Cisco). Chaque formation appartient à un seul sujet. */
export const SUBJECTS = [
  { id: "compagnie", label: "Animaux de compagnie", sub: "Chiens, chats, lapins et cobayes.", courses: ["premiers-secours", "vaccination-compagnie", "nutrition-chien-chat", "lapins-cobayes"] },
  { id: "elevage", label: "Animaux d’élevage", sub: "Volailles, ruminants, porcs et poissons.", courses: ["volailles", "chevres-moutons", "bovins", "porcs", "pisciculture", "gestion-elevage", "reproduction"] },
  { id: "sante", label: "Santé et prévention", sub: "Maladies, parasites, hygiène et bien-être.", courses: ["signes-maladie", "parasites", "zoonoses-rage", "biosecurite", "bien-etre", "epidemiologie"] },
  { id: "metiers", label: "Métiers vétérinaires", sub: "Parcours longs pour les professionnels.", courses: ["auxiliaire-veterinaire", "soins-infirmiers", "pharmacologie"] },
] as const;

export type SubjectId = (typeof SUBJECTS)[number]["id"];

export const subjectOf = (courseId: string): SubjectId | undefined =>
  SUBJECTS.find((s) => (s.courses as readonly string[]).includes(courseId))?.id;

export const coursesOf = (id: SubjectId): Course[] => COURSES.filter((c) => subjectOf(c.id) === id);

/** Filtres de durée du catalogue. */
export const DURATIONS = [
  { id: "short", label: "Moins de 6 h", test: (h: number) => h < 6 },
  { id: "mid", label: "6 à 12 h", test: (h: number) => h >= 6 && h <= 12 },
  { id: "long", label: "Parcours longs (40 h et plus)", test: (h: number) => h > 12 },
] as const;
export type DurationId = (typeof DURATIONS)[number]["id"];
