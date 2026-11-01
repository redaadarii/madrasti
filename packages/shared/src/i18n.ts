import i18n, { type InitOptions } from 'i18next'
import ar from './i18n/locales/ar.json'
import en from './i18n/locales/en.json'
import fr from './i18n/locales/fr.json'

/**
 * Traductions communes au web et au mobile. Le texte français sert de clé (style gettext) :
 * le code reste lisible et une clé absente retombe naturellement sur le français.
 * Chaque application initialise i18next (détection de la langue, persistance) avec {@link i18nOptions}.
 */
export const LANGUAGES = [
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr', locale: 'fr-FR' },
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr', locale: 'en-GB' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl', locale: 'ar-MA' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

export const isLanguage = (code: string | null | undefined): code is Language => LANGUAGES.some((l) => l.code === code)

export const languageInfo = (code = i18n.language) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]

export const translations = { fr, en, ar } as const

export const i18nOptions = (lng: Language): InitOptions => ({
  resources: { fr: { translation: fr }, en: { translation: en }, ar: { translation: ar } },
  lng,
  fallbackLng: 'fr',
  keySeparator: false,
  nsSeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
})

/** Traduction utilisable hors composants (libellés, notifications). */
export const t: typeof i18n.t = ((...args: Parameters<typeof i18n.t>) => i18n.t(...args)) as typeof i18n.t

export default i18n
