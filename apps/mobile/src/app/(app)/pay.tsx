import { useQuery } from '@tanstack/react-query'
import { onlineSessionQueryOptions, simulatePayment, useConfirmPayment } from '@madrasti/shared/features/payments/online'
import { formatCurrency } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'
import { Badge, Button, Card, EmptyState, Label, Loading, Screen, Title } from '@/components/ui'
import { t } from '@/lib/i18n'

/** Prestataire simulé (démonstration) : aucune donnée de carte, aucun argent ne circule. */
export default function SimulatedPaymentScreen() {
  const { session } = useLocalSearchParams<{ session: string }>()
  const { data, isError } = useQuery({ ...onlineSessionQueryOptions(session), enabled: !!session })
  const confirm = useConfirmPayment()
  const [pending, setPending] = useState(false)

  const pay = async () => {
    setPending(true)
    try {
      await simulatePayment(session)
      const result = await confirm.mutateAsync(session)
      Alert.alert(result.status === 'PAID' ? t('Paiement confirmé') : t('Paiement en attente'))
      router.back()
    } catch (e) {
      Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined)
      setPending(false)
    }
  }

  if (isError || !session) return <Screen><EmptyState icon="alert-circle-outline" title={t('Paiement introuvable')} /></Screen>
  if (!data) return <Loading />
  return (
    <Screen refreshable={false}>
      <Badge label={t('Paiement de démonstration')} tone="sun" icon="flask" />
      <Card>
        <Title>{data.label}</Title>
        <Label muted>{data.studentName}</Label>
        <Label style={{ fontSize: 34, fontWeight: '800' }}>{formatCurrency(data.amount)}</Label>
      </Card>
      <Label muted style={{ fontSize: 13 }}>
        {t('Aucun argent ne circule : en production, la famille est redirigée vers la page sécurisée du prestataire (Stripe).')}
      </Label>
      <Button label={t('Payer {{amount}}', { amount: formatCurrency(data.amount) })} icon="card" onPress={() => void pay()} loading={pending} disabled={data.status === 'PAID'} />
    </Screen>
  )
}
