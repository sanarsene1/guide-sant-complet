/** Question à choix multiple (quiz de chapitre ou examen final). `correct` = index dans `options`. */
export type CourseQuestion = { q: string; options: string[]; correct: number; exp: string };

export type CourseSection = { h: string; p: string[] };

export type Chapter = {
  id: string;
  title: string;
  minutes: number;
  intro: string;
  sections: CourseSection[];
  keyPoints: string[];
  quiz: CourseQuestion[];
  /** Vidéo YouTube d’explication, lue directement dans le chapitre. */
  video?: ChapterVideo;
};

export type ChapterVideo = { id: string; title: string; source: string; note?: string };

export type CourseLevel = "Débutant" | "Intermédiaire" | "Avancé";

export type Course = {
  id: string;
  title: string;
  /** Libellé court de l'animal ou du public visé ("Chiens et chats", "Volailles"...). */
  species: string;
  level: CourseLevel;
  /** Durée estimée en heures. */
  hours: number;
  /** Une phrase qui résume la formation. */
  summary: string;
  /** À qui s’adresse la formation (une phrase). */
  audience: string;
  /** Ce qu’il faut savoir avant de commencer. */
  prerequisites: string[];
  /** Introduction générale lue avant le chapitre 1 (2 à 3 paragraphes). */
  introduction: string[];
  objectives: string[];
  chapters: Chapter[];
  /** Questions propres à l’examen final ; l’examen en tire 30 avec celles des chapitres. */
  exam: CourseQuestion[];
};
