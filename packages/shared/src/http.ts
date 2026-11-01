/**
 * Client HTTP commun au web et au mobile. Chaque application le configure au démarrage :
 * le web s'authentifie par cookie HttpOnly (+ en-tête anti-CSRF), le mobile par jeton Bearer.
 */

/** Erreur HTTP normalisée à partir d'un ProblemDetail (RFC 9457) renvoyé par l'API. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

export interface ApiConfig {
  /** Préfixe des routes : « /api » sur le web (même origine), URL complète sur mobile. */
  baseUrl: string
  /** En-têtes ajoutés à chaque requête (langue, authentification…). */
  headers: () => Record<string, string> | Promise<Record<string, string>>
  credentials?: RequestCredentials
  /**
   * Jeton d'accès expiré : tente de le renouveler (mobile). Renvoie true si la requête peut être rejouée.
   * Sans cette fonction, ou si elle échoue, {@link onUnauthorized} est appelé.
   */
  refresh?: () => Promise<boolean>
  /** Session absente ou expirée (hors échec de connexion lui-même). */
  onUnauthorized?: () => void
  /** Message affiché quand l'API ne fournit pas de détail. */
  fallbackMessage?: () => string
}

let config: ApiConfig = { baseUrl: '/api', headers: () => ({}) }

export function configureApi(next: ApiConfig) {
  config = next
}

export type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
}

export function apiUrl(path: string, query?: Query) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return `${config.baseUrl}${path}${search ? `?${search}` : ''}`
}

/** Routes d'authentification : jamais de renouvellement automatique (évite les boucles). */
const isAuthRoute = (path: string) => path.startsWith('/auth/login') || path.startsWith('/auth/refresh') || path.startsWith('/auth/logout')

async function send(path: string, init: RequestInit, query?: Query, retried = false): Promise<Response> {
  const headers = { ...(await config.headers()), ...(init.headers as Record<string, string> | undefined) }
  const response = await fetch(apiUrl(path, query), { ...init, headers, credentials: config.credentials })
  if (!response.ok) {
    if (response.status === 401 && !isAuthRoute(path)) {
      // Une seule tentative : la requête est rejouée avec le nouveau jeton.
      if (!retried && config.refresh && await config.refresh()) return send(path, init, query, true)
      config.onUnauthorized?.()
    }
    const problem = await response.json().catch(() => ({}))
    throw new ApiError(response.status, problem.detail ?? config.fallbackMessage?.() ?? 'Error', problem.errors)
  }
  return response
}

export async function api<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const response = await send(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }, query)
  // Réponse sans contenu (204, ou 201 sans corps) : rien à décoder.
  const content = await response.text()
  return (content ? JSON.parse(content) : undefined) as T
}

/** Envoi multipart (fichiers) ; la plateforme fixe elle-même la frontière du Content-Type. */
export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const response = await send(path, { method: 'POST', body: form })
  return response.json()
}

/** Téléchargement authentifié (fichiers, exports CSV). */
export async function apiBlob(path: string, query?: Query): Promise<Blob> {
  return (await send(path, {}, query)).blob()
}
