const TONES = [
  'border-s-primary bg-secondary/70',
  'border-s-coral bg-coral/10',
  'border-s-mint bg-mint/15',
  'border-s-sun bg-sun/25',
  'border-s-chart-5 bg-chart-5/10',
]

/** Couleur stable par matière (même matière → même couleur partout dans l'application). */
export function subjectTone(subject: string) {
  let hash = 0
  for (const char of subject) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}
