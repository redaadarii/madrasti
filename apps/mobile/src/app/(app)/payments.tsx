import { useQuery } from '@tanstack/react-query'
import { PAYMENT_METHOD_LABELS } from '@madrasti/shared/features/payments/api'
import { startCheckout, useConfirmPayment } from '@madrasti/shared/features/payments/online'
import { studentPaymentsQueryOptions } from '@madrasti/shared/features/payments/queries'
import { formatCurrency, formatDate } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Alert, View } from 'react-native'
import { Badge, Button, Card, ChildPicker, EmptyState, Label, Loading, Screen, Section, type Tone } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  PAID: { label: 'Payé', tone: 'mint' },
  PENDING: { label: 'À venir', tone: 'sun' },
  OVERDUE: { label: 'En retard', tone: 'danger' },
}

export default function PaymentsScreen() {
  const { student } = useFamily()
  const { data: payments, isPending } = useQuery({ ...studentPaymentsQueryOptions(student?.id ?? 0), enabled: !!student })
  const confirm = useConfirmPayment()
  const [paying, setPaying] = useState<number>()

  /**
   * Paiement en ligne : page du prestataire (Stripe, ou CMI via la page signée du serveur) dans le navigateur
   * sécurisé du téléphone, puis vérification côté serveur ; en démonstration, écran simulé dans l'application.
   */
  const pay = async (paymentId: number) => {
    setPaying(paymentId)
    try {
      const checkout = await startCheckout(paymentId, 'mobile')
      if (checkout.redirectUrl.includes('/pay/simulated')) {
        router.push({ pathname: '/pay', params: { session: checkout.session } })
      } else {
        await WebBrowser.openBrowserAsync(checkout.redirectUrl)
        const result = await confirm.mutateAsync(checkout.session)
        Alert.alert(result.status === 'PAID' ? t('Paiement confirmé') : t('Paiement en attente'))
      }
    } catch (e) {
      Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined)
    } finally {
      setPaying(undefined)
    }
  }

  if (!student || isPending) return <Loading />
  const due = (payments ?? []).filter((p) => p.status !== 'PAID')
  const paid = (payments ?? []).filter((p) => p.status === 'PAID')

  return (
    <Screen>
      <ChildPicker />
      {!payments?.length && <EmptyState icon="wallet-outline" title={t('Aucun paiement')} />}
      {due.length > 0 && (
        <Section title={t('À régler')}>
          {due.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Label style={{ fontWeight: '700', flex: 1 }}>{p.label}</Label>
                <Badge label={t(STATUS[p.status].label)} tone={STATUS[p.status].tone} />
              </View>
              <Label muted>{t('Échéance {{date}}', { date: formatDate(p.dueDate) })}</Label>
              <Label style={{ fontSize: 22, fontWeight: '800' }}>{formatCurrency(p.amount)}</Label>
              <Button label={t('Payer en ligne')} icon="card" onPress={() => void pay(p.id)} loading={paying === p.id} disabled={paying !== undefined} />
            </Card>
          ))}
        </Section>
      )}
      {paid.length > 0 && (
        <Section title={t('Réglés')}>
          {paid.map((p) => (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Label style={{ fontWeight: '600', flex: 1 }}>{p.label}</Label>
                <Label style={{ fontWeight: '700' }}>{formatCurrency(p.amount)}</Label>
              </View>
              <Label muted style={{ fontSize: 13 }}>
                {t('réglé le {{date}}', { date: formatDate(p.paidAt!) })}{p.method ? ` · ${t(PAYMENT_METHOD_LABELS[p.method])}` : ''}
              </Label>
            </Card>
          ))}
        </Section>
      )}
    </Screen>
  )
}
