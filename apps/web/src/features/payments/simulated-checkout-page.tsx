import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { CreditCard, FlaskConical, Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { formatCurrency } from '@madrasti/shared/format'
import { onlineSessionQueryOptions, simulatePayment } from '@madrasti/shared/features/payments/online'

/** Imite la page d'un prestataire de paiement (mode démonstration : aucune donnée de carte n'est envoyée). */
export function SimulatedCheckoutPage() {
  const { session } = useSearch({ from: '/app/pay/simulated' })
  const { data } = useSuspenseQuery(onlineSessionQueryOptions(session))
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  const pay = async () => {
    setPending(true)
    try {
      await simulatePayment(session)
      await navigate({ to: '/payments/return', search: { session } })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue'))
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader>
          <Badge className="mb-2 w-fit border-0 bg-sun/40 text-sun-foreground"><FlaskConical /> {t('Paiement de démonstration')}</Badge>
          <CardTitle className="text-xl">{data.label}</CardTitle>
          <p className="text-sm text-muted-foreground">{data.studentName}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-heading text-4xl font-semibold tabular-nums">{formatCurrency(data.amount)}</p>
          <div className="space-y-2" aria-hidden>
            <Input disabled value="4242 4242 4242 4242" className="font-mono" />
            <div className="grid grid-cols-2 gap-2">
              <Input disabled value="12/30" />
              <Input disabled value="123" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Aucun argent ne circule : en production, la famille est redirigée vers la page sécurisée du prestataire (Stripe).')}
          </p>
          <Button className="w-full" size="lg" onClick={pay} disabled={pending || data.status === 'PAID'}>
            <CreditCard /> {t('Payer {{amount}}', { amount: formatCurrency(data.amount) })}
          </Button>
          <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> {t('Paiement sécurisé')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
