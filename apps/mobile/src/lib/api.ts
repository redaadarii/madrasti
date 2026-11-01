import type { TokenResponse } from '@madrasti/shared/features/auth/api'
import { configureApi } from '@madrasti/shared/http'
import i18n, { t } from '@madrasti/shared/i18n'
import { API_URL } from './config'
import { clearTokens, currentToken, saveTokens, storedRefreshToken } from './session'

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** Session expirée ou révoquée : l'écran racine renvoie vers la connexion. */
export function onUnauthorized(listener: Listener) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

let refreshing: Promise<boolean> | null = null

/**
 * Renouvelle le jeton d'accès avec le jeton de rafraîchissement (rotation côté serveur).
 * Un seul renouvellement à la fois : les requêtes parallèles qui reçoivent un 401 attendent le même résultat,
 * sinon elles présenteraient un jeton déjà consommé et le serveur révoquerait la session.
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await storedRefreshToken()
      if (!refreshToken) return false
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': i18n.language },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) {
        await clearTokens()
        return false
      }
      await saveTokens(await response.json() as TokenResponse)
      return true
    } catch {
      // Réseau indisponible : la session est conservée, la requête échoue normalement.
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** Même client et mêmes services que le web ; seule l'authentification change (jeton Bearer renouvelable). */
configureApi({
  baseUrl: API_URL,
  headers: () => {
    const token = currentToken()
    return { 'Accept-Language': i18n.language, ...(token && { Authorization: `Bearer ${token}` }) }
  },
  credentials: 'omit',
  refresh: refreshSession,
  onUnauthorized: () => unauthorizedListeners.forEach((listener) => listener()),
  fallbackMessage: () => t('Une erreur est survenue'),
})
