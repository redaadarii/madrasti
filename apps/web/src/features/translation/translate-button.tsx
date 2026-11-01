import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import { Languages, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { languageInfo, t } from '@/i18n'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const statusQueryOptions = queryOptions({
  queryKey: ['translation-status'],
  queryFn: () => api<{ enabled: boolean }>('/translate/status'),
  staleTime: Infinity,
  select: (data) => data.enabled,
})

/**
 * « Traduire » sous un contenu saisi par un utilisateur (annonce, message), vers la langue de l'interface.
 * Invisible si la traduction automatique n'est pas configurée côté serveur.
 */
export function TranslateButton({ text, className }: { text: string; className?: string }) {
  const { i18n } = useTranslation()
  const { data: enabled } = useQuery(statusQueryOptions)
  const [shown, setShown] = useState(false)
  const translate = useMutation({
    mutationFn: () => api<{ translation: string }>('/translate', { method: 'POST', body: { text, target: i18n.language } }),
  })

  if (!enabled) return null
  const target = languageInfo(i18n.language)

  return (
    <div className={cn('space-y-1.5', className)}>
      <Button variant="link" size="xs" className="h-auto px-0 text-xs"
        onClick={() => {
          if (shown) return setShown(false)
          setShown(true)
          if (!translate.data) translate.mutate()
        }}>
        {translate.isPending ? <Loader2 className="animate-spin" /> : <Languages />}
        {shown ? t("Afficher l'original") : t('Traduire en {{language}}', { language: target.label })}
      </Button>
      {shown && translate.data && (
        <p lang={target.code} dir={target.dir} className="rounded-lg border-s-2 border-primary/40 bg-secondary/40 px-3 py-2 text-sm whitespace-pre-line">
          {translate.data.translation}
        </p>
      )}
      {shown && translate.error && <p className="text-xs text-destructive">{translate.error.message}</p>}
    </div>
  )
}
