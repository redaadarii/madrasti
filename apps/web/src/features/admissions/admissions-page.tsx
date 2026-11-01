import { useSuspenseQuery } from '@tanstack/react-query'
import { Check, ClipboardList, Mail, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import { type AdmissionStatus, admissionsQueryOptions, useDecideAdmission } from '@madrasti/shared/features/admissions/api'
import { t } from '@/i18n'

const LABELS: Record<AdmissionStatus, string> = { PENDING: 'En attente', ACCEPTED: 'Acceptée', REJECTED: 'Refusée' }
const TONES: Record<AdmissionStatus, string> = {
  PENDING: 'bg-sun/40 text-sun-foreground',
  ACCEPTED: 'bg-mint/30 text-mint-foreground',
  REJECTED: 'bg-destructive/10 text-destructive',
}

export function AdmissionsPage() {
  const { data: requests } = useSuspenseQuery(admissionsQueryOptions)
  const [filter, setFilter] = useState<AdmissionStatus>('PENDING')
  const decide = useDecideAdmission()
  const visible = requests.filter((r) => r.status === filter)

  const act = (id: number, status: AdmissionStatus) =>
    decide.mutate({ id, status }, { onSuccess: () => toast.success(status === 'ACCEPTED' ? t('Pré-inscription acceptée') : t('Pré-inscription refusée')) })

  return (
    <>
      <PageHeader title={t('Pré-inscriptions')} description={t('Demandes déposées en ligne par les familles depuis le site public.')} />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as AdmissionStatus)} className="mb-4">
        <TabsList>
          {(Object.keys(LABELS) as AdmissionStatus[]).map((s) => (
            <TabsTrigger key={s} value={s}>{t(LABELS[s])} ({requests.filter((r) => r.status === s).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {visible.length === 0 ? <EmptyState icon={ClipboardList} title={t('Aucune demande')} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-xl font-semibold">{r.childFirstName} {r.childLastName}</p>
                    <p className="text-sm text-muted-foreground">{t('Né(e) le {{date}}', { date: formatDate(r.birthDate) })} · {t('niveau souhaité')} <strong>{t(r.desiredLevel)}</strong></p>
                  </div>
                  <Badge className={cn('border-0', TONES[r.status])}>{t(LABELS[r.status])}</Badge>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-sm">
                  <p className="font-medium">{r.parentName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Mail className="size-3.5" /> <a className="hover:underline" href={`mailto:${r.parentEmail}`}>{r.parentEmail}</a></p>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3.5" /> <a className="hover:underline" href={`tel:${r.parentPhone}`}>{r.parentPhone}</a></p>
                </div>
                {r.message && <p className="text-sm italic text-muted-foreground">« {r.message} »</p>}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t('Reçue le {{date}}', { date: formatDate(r.createdAt) })}</span>
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => act(r.id, 'REJECTED')}><X /> {t('Refuser')}</Button>
                      <Button size="sm" onClick={() => act(r.id, 'ACCEPTED')}><Check /> {t('Accepter')}</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
