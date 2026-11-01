import { getLocales } from 'expo-localization'
import * as SecureStore from 'expo-secure-store'
import { I18nManager } from 'react-native'
import i18n, { i18nOptions, isLanguage, type Language, languageInfo } from '@madrasti/shared/i18n'
import { initReactI18next } from 'react-i18next'

export { LANGUAGES, languageInfo, t } from '@madrasti/shared/i18n'

/** Préférence légère, lue de façon synchrone au démarrage (avant le premier rendu). */
const STORAGE_KEY = 'madrasti.lang'

/** Langue choisie dans l'application, sinon celle du téléphone, sinon le français. */
function initialLanguage(): Language {
  const stored = SecureStore.getItem(STORAGE_KEY)
  if (isLanguage(stored)) return stored
  const device = getLocales()[0]?.languageCode
  return isLanguage(device) ? device : 'fr'
}

void i18n.use(initReactI18next).init(i18nOptions(initialLanguage()))

/**
 * Change la langue : les textes sont traduits immédiatement ; le sens de lecture (arabe) est
 * appliqué par React Native au prochain lancement. Renvoie true si un redémarrage est nécessaire.
 */
export async function changeLanguage(code: Language) {
  await i18n.changeLanguage(code)
  SecureStore.setItem(STORAGE_KEY, code)
  const rtl = languageInfo(code).dir === 'rtl'
  I18nManager.allowRTL(rtl)
  I18nManager.forceRTL(rtl)
  return I18nManager.isRTL !== rtl
}

export default i18n
