import { configureApi } from '@madrasti/shared/http'
import i18n, { t } from '@/i18n'

export { api, apiBlob, apiForm, ApiError } from '@madrasti/shared/http'

/**
 * La session vit dans un cookie HttpOnly posé par l'API : le jeton n'est jamais lisible par le
 * JavaScript (protection contre le vol par XSS). On nettoie l'ancien stockage local s'il existe.
 */
try {
  localStorage.removeItem('madrasti.token')
} catch {
  // stockage indisponible : rien à nettoyer
}

export const UNAUTHORIZED_EVENT = 'madrasti:unauthorized'

/**
 * En-têtes communs : langue (erreurs traduites selon Accept-Language) et en-tête applicatif exigé par
 * l'API pour toute requête modifiante authentifiée par cookie (défense CSRF).
 */
export function authHeaders(): Record<string, string> {
  return { 'Accept-Language': i18n.language, 'X-Madrasti-Client': 'web' }
}

configureApi({
  baseUrl: '/api',
  headers: authHeaders,
  credentials: 'same-origin',
  // Session absente ou expirée : retour à l'écran de connexion.
  onUnauthorized: () => window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)),
  fallbackMessage: () => t('Une erreur est survenue'),
})
