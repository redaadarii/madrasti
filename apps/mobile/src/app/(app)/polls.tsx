import { useQuery } from '@tanstack/react-query'
import { pollsQueryOptions, useVote } from '@madrasti/shared/features/polls/api'
import { formatDate } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { Badge, Card, EmptyState, Label, Loading, Screen, Title } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function PollsScreen() {
  const c = useTheme()
  const { data: polls, isPending } = useQuery(pollsQueryOptions)
  const vote = useVote()
  if (isPending) return <Loading />
  if (!polls?.length) return <Screen><EmptyState icon="stats-chart-outline" title={t('Aucun sondage pour le moment')} /></Screen>

  return (
    <Screen>
      {polls.map((poll) => {
        const canVote = poll.open && poll.myChoice === null
        const total = poll.totalVotes ?? 0
        return (
          <Card key={poll.id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {!poll.open ? <Badge label={t('Clôturé')} tone="muted" />
                : poll.closesOn && <Badge label={t('Jusqu\'au {{date}}', { date: formatDate(poll.closesOn) })} tone="sun" />}
              {poll.myChoice !== null && <Badge label={t('Répondu')} tone="mint" icon="checkmark" />}
            </View>
            <Title style={{ fontSize: 18 }}>{poll.question}</Title>
            {poll.options.map((option) => {
              const share = poll.totalVotes ? Math.round(((option.votes ?? 0) / total) * 100) : 0
              const chosen = poll.myChoice === option.id
              return canVote ? (
                <Pressable key={option.id} accessibilityRole="button" disabled={vote.isPending}
                  onPress={() => vote.mutate({ pollId: poll.id, optionId: option.id }, {
                    onError: (e) => Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined),
                  })}
                  style={[styles.option, { borderColor: c.primary }]}>
                  <Text style={{ color: c.primary, fontWeight: '600' }}>{option.label}</Text>
                </Pressable>
              ) : (
                <View key={option.id} style={[styles.option, { borderColor: chosen ? c.primary : c.border, overflow: 'hidden' }]}>
                  <View style={[StyleSheet.absoluteFill, { width: `${share}%`, backgroundColor: c.primarySoft }]} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: c.text, fontWeight: chosen ? '700' : '400' }}>{chosen ? '✓ ' : ''}{option.label}</Text>
                    {poll.totalVotes !== null && <Text style={{ color: c.muted }}>{share}%</Text>}
                  </View>
                </View>
              )
            })}
            <Label muted style={{ fontSize: 13 }}>
              {poll.totalVotes !== null ? t('{{count}} réponses', { count: total }) : t('Résultats visibles après votre réponse')}
            </Label>
          </Card>
        )
      })}
    </Screen>
  )
}

const styles = StyleSheet.create({
  option: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11 },
})
