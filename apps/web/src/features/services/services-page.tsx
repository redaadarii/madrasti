import { useQuery } from '@tanstack/react-query'
import { BusFront, Clock, Pencil, Plus, Sparkles, Users, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { useFamilyStudent } from '@/features/students/child-picker'
import { formatCurrency } from '@madrasti/shared/format'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import { type CampusService, SERVICE_KIND_LABELS, type ServiceKind, servicesQueryOptions, subscribersQueryOptions, useToggleSubscription } from '@madrasti/shared/features/services/api'
import { ServiceDialog } from './service-dialog'
import { t } from '@/i18n'

const KIND_ICONS = { TRANSPORT: BusFront, CANTEEN: UtensilsCrossed, ACTIVITY: Sparkles } as const

export function ServicesPage() {
  const user = useCurrentUser()
  const isManager = MANAGER_ROLES.includes(user.role)
  const family = useFamilyStudent()
  const { data: services = [] } = useQuery(servicesQueryOptions(family.student?.id))
  const toggle = useToggleSubscription()
  const [editing, setEditing] = useState<{ open: boolean; service?: CampusService }>({ open: false })
  const [listing, setListing] = useState<CampusService | null>(null)

  const onToggle = (service: CampusService) => {
    if (!family.student) return
    const subscribe = !service.subscribed
    toggle.mutate({ serviceId: service.id, studentId: family.student.id, subscribe }, {
      onSuccess: () => toast.success(subscribe
        ? t("{{name}} est inscrit(e) — l'échéance du mois a été ajoutée aux paiements", { name: family.student!.firstName })
        : t('Inscription annulée')),
      onError: (error) => toast.error(error.message),
    })
  }

  return (
    <>
      <PageHeader title={t('Transport, cantine & activités')}
        description={family.student ? t('Services pour {{name}}', { name: family.student.firstName }) : t('Catalogue des services périscolaires et inscriptions.')}
        actions={<>{family.picker}{isManager && <Button onClick={() => setEditing({ open: true })}><Plus /> {t('Nouveau service')}</Button>}</>} />
      {services.length === 0 && <EmptyState icon={BusFront} title={t('Aucun service proposé')} />}
      <div className="space-y-8">
        {(Object.keys(SERVICE_KIND_LABELS) as ServiceKind[]).map((kind) => {
          const items = services.filter((s) => s.kind === kind)
          if (items.length === 0) return null
          const Icon = KIND_ICONS[kind]
          return (
            <section key={kind}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Icon className="size-5 text-coral" /> {t(SERVICE_KIND_LABELS[kind])}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((service) => {
                  const full = service.capacity != null && service.subscribers >= service.capacity
                  return (
                    <Card key={service.id} className={service.active ? undefined : 'opacity-60'}>
                      <CardHeader>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        {service.description && <CardDescription>{service.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-1.5 text-sm">
                        <p className="font-heading text-2xl font-semibold">{formatCurrency(service.monthlyFee)}<span className="text-sm font-normal text-muted-foreground"> {t('/ mois')}</span></p>
                        {service.schedule && <p className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3.5" /> {service.schedule}</p>}
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="size-3.5" /> {service.capacity ? t('{{taken}}/{{capacity}} places', { taken: service.subscribers, capacity: service.capacity }) : t('{{count}} inscrits', { count: service.subscribers })}
                        </p>
                      </CardContent>
                      <CardFooter className="justify-between gap-2">
                        {service.subscribed && <Badge className="border-0 bg-mint/30 text-mint-foreground">{t('Inscrit')}</Badge>}
                        {!service.active && <Badge variant="outline">{t('Fermé')}</Badge>}
                        <div className="ms-auto flex gap-2">
                          {user.role === 'PARENT' && family.student && (
                            <Button size="sm" variant={service.subscribed ? 'outline' : 'default'}
                              disabled={toggle.isPending || (!service.subscribed && (full || !service.active))} onClick={() => onToggle(service)}>
                              {service.subscribed ? t('Désinscrire') : full ? t('Complet') : t('Inscrire')}
                            </Button>
                          )}
                          {isManager && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setListing(service)}><Users /> {t('Inscrits')}</Button>
                              <Button size="icon-sm" variant="ghost" aria-label={t('Modifier {{name}}', { name: service.name })} onClick={() => setEditing({ open: true, service })}><Pencil /></Button>
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <ServiceDialog state={editing} onOpenChange={(open) => setEditing((s) => ({ ...s, open }))} />
      <SubscribersSheet service={listing} onClose={() => setListing(null)} />
    </>
  )
}

function SubscribersSheet({ service, onClose }: { service: CampusService | null; onClose: () => void }) {
  const { data: subscribers = [] } = useQuery({ ...subscribersQueryOptions(service?.id ?? 0), enabled: !!service })
  return (
    <Sheet open={!!service} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{service?.name}</SheetTitle>
          <SheetDescription>{t('{{count}} élèves inscrits', { count: subscribers.length })}</SheetDescription>
        </SheetHeader>
        <ul className="space-y-2 px-4">
          {subscribers.map((s) => (
            <li key={s.studentId} className="flex justify-between rounded-xl border px-3 py-2 text-sm">
              <span className="font-medium">{s.studentName}</span><span className="text-muted-foreground">{s.classroomName}</span>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
