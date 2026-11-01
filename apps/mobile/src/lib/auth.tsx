import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type User } from '@madrasti/shared/features/auth/api'
import { meQueryOptions } from '@madrasti/shared/features/auth/queries'
import { api } from '@madrasti/shared/http'
import { createContext, type ReactNode, use, useCallback, useEffect, useMemo, useState } from 'react'
import { onUnauthorized } from './api'
import { clearTokens, loadTokens, saveTokens, storedRefreshToken } from './session'

/** Rôles servis par l'application mobile ; le personnel utilise l'espace web. */
const FAMILY_ROLES = ['PARENT', 'STUDENT'] as const

export class StaffAccountError extends Error {}

interface Auth {
  status: 'loading' | 'signedOut' | 'signedIn'
  user: User | undefined
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState<boolean>()
  const me = useQuery({ ...meQueryOptions, enabled: hasToken === true })

  useEffect(() => {
    // Un jeton d'accès expiré sera renouvelé automatiquement à la première requête.
    void loadTokens().then(({ access, refresh }) => setHasToken(!!(access || refresh)))
  }, [])

  const signOut = useCallback(async () => {
    await clearTokens()
    queryClient.clear()
    setHasToken(false)
  }, [queryClient])

  // Jeton expiré ou révoqué : on repart de l'écran de connexion.
  useEffect(() => onUnauthorized(() => void signOut()), [signOut])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await authApi.login({ email, password, client: 'mobile' })
    const { user } = tokens
    if (!FAMILY_ROLES.includes(user.role as (typeof FAMILY_ROLES)[number])) {
      // Révoque la session ouverte côté serveur, puisqu'elle ne sera pas utilisée.
      await api<void>('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refreshToken } }).catch(() => undefined)
      throw new StaffAccountError()
    }
    await saveTokens(tokens)
    queryClient.setQueryData(meQueryOptions.queryKey, user)
    setHasToken(true)
  }, [queryClient])

  const logout = useCallback(async () => {
    // Révoque le jeton de rafraîchissement : il ne pourra plus rouvrir de session.
    const refreshToken = await storedRefreshToken()
    await api<void>('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined)
    await signOut()
  }, [signOut])

  const value = useMemo<Auth>(() => ({
    status: hasToken === undefined || (hasToken && me.isPending) ? 'loading' : hasToken && me.data ? 'signedIn' : 'signedOut',
    user: me.data,
    login,
    logout,
  }), [hasToken, me.isPending, me.data, login, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const auth = use(AuthContext)
  if (!auth) throw new Error('useAuth hors de AuthProvider')
  return auth
}

/** Utilisateur connecté : garanti sous les écrans protégés. */
export function useUser() {
  const { user } = useAuth()
  if (!user) throw new Error('Aucun utilisateur connecté')
  return user
}
