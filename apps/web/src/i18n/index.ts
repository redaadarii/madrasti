import i18n, { i18nOptions, isLanguage, type Language, languageInfo } from '@madrasti/shared/i18n'
import { initReactI18next } from 'react-i18next'

export { LANGUAGES, type Language, languageInfo, t } from '@madrasti/shared/i18n'

const STORAGE_KEY = 'madrasti.lang'

function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // stockage indisponible : on se rabat sur la langue du navigateur
  }
  const browser = navigator.language.slice(0, 2)
  return isLanguage(browser) ? browser : 'fr'
}

function applyDocumentLanguage(code: string) {
  const info = languageInfo(code)
  document.documentElement.lang = info.code
  document.documentElement.dir = info.dir
}

void i18n.use(initReactI18next).init(i18nOptions(initialLanguage()))

applyDocumentLanguage(i18n.language)
i18n.on('languageChanged', (code) => {
  applyDocumentLanguage(code)
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // préférence non mémorisée en navigation privée
  }
})

export default i18n
