import { COURSE as c_premiers_secours } from "./content/premiers-secours";
import { COURSE as c_vaccination_compagnie } from "./content/vaccination-compagnie";
import { COURSE as c_nutrition_chien_chat } from "./content/nutrition-chien-chat";
import { COURSE as c_parasites } from "./content/parasites";
import { COURSE as c_signes_maladie } from "./content/signes-maladie";
import { COURSE as c_zoonoses_rage } from "./content/zoonoses-rage";
import { COURSE as c_volailles } from "./content/volailles";
import { COURSE as c_chevres_moutons } from "./content/chevres-moutons";
import { COURSE as c_bovins } from "./content/bovins";
import { COURSE as c_porcs } from "./content/porcs";
import { COURSE as c_lapins_cobayes } from "./content/lapins-cobayes";
import { COURSE as c_biosecurite } from "./content/biosecurite";
import { COURSE as c_bien_etre } from "./content/bien-etre";
import { COURSE as c_reproduction } from "./content/reproduction";
import { COURSE as c_pisciculture } from "./content/pisciculture";
import { COURSE as c_auxiliaire_veterinaire } from "./content/auxiliaire-veterinaire";
import { COURSE as c_gestion_elevage } from "./content/gestion-elevage";
import { COURSE as c_pharmacologie } from "./content/pharmacologie";
import { COURSE as c_soins_infirmiers } from "./content/soins-infirmiers";
import { COURSE as c_epidemiologie } from "./content/epidemiologie";
import { VIDEOS } from "./videos";
import type { Course } from "./types";

export type { Course, Chapter, CourseQuestion } from "./types";

const withVideos = (c: Course): Course => ({
  ...c,
  chapters: c.chapters.map((ch) => {
    const v = VIDEOS[c.id]?.[ch.id];
    return v ? { ...ch, video: v } : ch;
  }),
});

/** Les formations VetoCare, dans l’ordre d’affichage (les 5 formations longues à la fin). */
export const COURSES: Course[] = [
  c_premiers_secours,
  c_vaccination_compagnie,
  c_nutrition_chien_chat,
  c_parasites,
  c_signes_maladie,
  c_zoonoses_rage,
  c_volailles,
  c_chevres_moutons,
  c_bovins,
  c_porcs,
  c_lapins_cobayes,
  c_biosecurite,
  c_bien_etre,
  c_reproduction,
  c_pisciculture,
  c_auxiliaire_veterinaire,
  c_gestion_elevage,
  c_pharmacologie,
  c_soins_infirmiers,
  c_epidemiologie,
].map(withVideos);

export const courseById = (id: string) => COURSES.find((c) => c.id === id);
