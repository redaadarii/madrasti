import { languageInfo } from './i18n'

const cache = new Map<string, Intl.DateTimeFormat>()

/** Formateur de dates dans la langue courante (mis en cache par langue et options). */
export function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = languageInfo().locale
  const key = locale + JSON.stringify(options)
  let format = cache.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    cache.set(key, format)
  }
  return format
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat(languageInfo().locale, { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(value)

export const formatDate = (value: string) =>
  dateFormat({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))

export const initials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

export function scoreOutOf20(score: number, maxScore: number) {
  return Math.round((score / maxScore) * 20 * 100) / 100
}
