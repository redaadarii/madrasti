import { Link, useSearch } from '@tanstack/react-router'
import { CheckCircle2, Hourglass, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { formatCurrency } from '@madrasti/shared/format'
import { useConfirmPayment } from '@madrasti/shared/features/payments/online'

/** Retour du prestataire : le serveur vérifie auprès de lui que la session est bien payée. */
export function PaymentReturnPage() {
  const { session } = useSearch({ from: '/app/payments/return' })
  const confirm = useConfirmPayment()
  const { mutate } = confirm

  useEffect(() => {
    mutate(session)
  }, [mutate, session])

  if (confirm.isPending || confirm.isIdle) return <Skeleton className="mx-auto mt-10 h-56 max-w-md" />

  const result = confirm.data
  const paid = result?.status === 'PAID'
  const Icon = confirm.isError ? XCircle : paid ? CheckCircle2 : Hourglass

  return (
    <Card className="mx-auto mt-6 max-w-md text-center">
      <CardContent className="flex flex-col items-center gap-3 py-6">
        <Icon className={paid ? 'size-12 text-mint-foreground dark:text-mint' : confirm.isError ? 'size-12 text-destructive' : 'size-12 text-sun-foreground'} />
        <h1 className="font-heading text-2xl font-semibold">
          {confirm.isError ? t('Paiement introuvable') : paid ? t('Paiement confirmé') : t('Paiement en attente')}
        </h1>
        {result && (
          <p className="text-muted-foreground">
            {result.payment.label} · {formatCurrency(result.payment.amount)}
          </p>
        )}
        {confirm.isError && <p className="text-sm text-muted-foreground">{confirm.error instanceof ApiError ? confirm.error.message : ''}</p>}
        {!paid && !confirm.isError && (
          <>
            <p className="text-sm text-muted-foreground">{t('Le prestataire n\'a pas encore confirmé le paiement.')}</p>
            <Button variant="outline" onClick={() => mutate(session)}>{t('Vérifier à nouveau')}</Button>
          </>
        )}
        {result && (
          <Button nativeButton={false} render={<Link to="/students/$studentId" params={{ studentId: result.studentId }} />}>
            {t('Retour à la fiche de l\'élève')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
