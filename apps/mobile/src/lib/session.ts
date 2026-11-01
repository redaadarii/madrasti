import * as SecureStore from 'expo-secure-store'

/**
 * Jetons conservés dans le trousseau (Keychain iOS / Keystore Android), jamais en clair.
 * Le jeton d'accès (15 min) est aussi gardé en mémoire : chaque requête le lit sans accès disque ;
 * le jeton de rafraîchissement (30 jours, à usage unique) ne sert qu'à en obtenir un nouveau.
 */
const ACCESS_KEY = 'madrasti.accessToken'
const REFRESH_KEY = 'madrasti.refreshToken'
let access: string | null = null

export async function loadTokens() {
  access = await SecureStore.getItemAsync(ACCESS_KEY)
  return { access, refresh: await SecureStore.getItemAsync(REFRESH_KEY) }
}

export async function saveTokens(tokens: { accessToken: string; refreshToken: string | null }) {
  access = tokens.accessToken
  await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken)
  if (tokens.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken)
}

export async function clearTokens() {
  access = null
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)])
}

export const currentToken = () => access
export const storedRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY)
