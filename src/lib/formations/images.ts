/** Photo d’illustration de l’introduction et de chaque chapitre : /formations/img/<formation>-<intro|c1…>.webp */
export function stepImage(courseId: string, step: string): string {
  return `/formations/img/${courseId}-${step}.webp`;
}
