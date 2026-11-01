/** Grille d'un mois en semaines complètes (lundi → dimanche), pour l'affichage calendrier. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // lundi = 0
  const start = new Date(year, month, 1 - offset)
  const last = new Date(year, month + 1, 0)
  const days = Math.ceil((offset + last.getDate()) / 7) * 7
  return Array.from({ length: days }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
