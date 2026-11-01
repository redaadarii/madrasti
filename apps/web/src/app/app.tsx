import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { meQueryOptions } from '@madrasti/shared/features/auth/queries'
import { api, UNAUTHORIZED_EVENT } from '@/lib/api-client'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))
  const { i18n } = useTranslation()

  // Session expirée : on vide le cache et on renvoie vers la connexion.
  useEffect(() => {
    const onUnauthorized = () => {
      queryClient.clear()
      router.navigate({ to: '/login' })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [queryClient, router])

  // La langue choisie sert aussi aux SMS et notifications envoyés par le serveur.
  useEffect(() => {
    const persist = (language: string) => {
      if (queryClient.getQueryData(meQueryOptions.queryKey)) void api('/auth/me/language', { method: 'PUT', body: { language } }).catch(() => undefined)
    }
    i18n.on('languageChanged', persist)
    return () => i18n.off('languageChanged', persist)
  }, [i18n, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Remonté à chaque changement de langue : tous les libellés et formats se recalculent. */}
        <RouterProvider key={i18n.language} router={router} />
        <Toaster richColors position={i18n.dir() === 'rtl' ? 'top-left' : 'top-right'} dir={i18n.dir()} />
      </TooltipProvider>
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
