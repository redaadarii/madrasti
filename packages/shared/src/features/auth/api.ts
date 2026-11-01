import { api } from '../../http'
import type { Role } from '../../types'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: Role
  schoolId: number | null
  schoolName: string | null
  active: boolean
  createdAt: string
}

export interface TokenResponse {
  accessToken: string
  expiresAt: string
  user: User
  /** Application mobile uniquement. */
  refreshToken: string | null
  refreshExpiresAt: string | null
}

export const authApi = {
  /** {@code client: 'mobile'} : jeton de rafraîchissement au lieu du cookie de session. */
  login: (credentials: { email: string; password: string; client?: 'mobile' }) =>
    api<TokenResponse>('/auth/login', { method: 'POST', body: credentials }),
  me: () => api<User>('/auth/me'),
}
