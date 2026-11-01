import { useQuery } from '@tanstack/react-query'
import { categoryInfo, SANCTION_LABELS, studentBehaviorQueryOptions } from '@madrasti/shared/features/behavior/api'
import { formatDate } from '@madrasti/shared/format'
import { StyleSheet, Text, View } from 'react-native'
import { Badge, Card, ChildPicker, EmptyState, Label, ListRow, Loading, Screen } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function BehaviorScreen() {
  const c = useTheme()
  const { student } = useFamily()
  const { data, isPending } = useQuery({ ...studentBehaviorQueryOptions(student?.id ?? 0), enabled: !!student })
  if (!student || isPending || !data) return <Loading />
  const stats = [
    { label: t('Points positifs'), value: String(data.positives), color: c.mint },
    { label: t('Incidents'), value: String(data.incidents), color: c.coral },
    { label: t('Solde de points'), value: data.balance > 0 ? `+${data.balance}` : String(data.balance), color: c.primary },
  ]
  return (
    <Screen>
      <ChildPicker />
      <View style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ color: s.color, fontSize: 24, fontWeight: '800' }}>{s.value}</Text>
            <Text style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>{s.label}</Text>
          </View>
        ))}
      </View>
      {data.records.length === 0 ? <EmptyState icon="sparkles-outline" title={t('Aucune observation pour le moment')} /> : (
        <Card style={{ paddingVertical: 4 }}>
          {data.records.map((r, i) => {
            const info = categoryInfo(r.category)
            return (
              <ListRow key={r.id} title={`${info.emoji}  ${t(info.label)}`} last={i === data.records.length - 1}
                subtitle={[r.note, `${formatDate(r.occurredOn)}${r.authorName ? ` · ${r.authorName}` : ''}`].filter(Boolean).join('\n')}
                trailing={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Label style={{ fontWeight: '800', color: r.positive ? c.mint : c.danger }}>{r.points > 0 ? `+${r.points}` : r.points}</Label>
                    {r.sanction && <Badge label={t(SANCTION_LABELS[r.sanction])} tone="danger" />}
                  </View>
                } />
            )
          })}
        </Card>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 6 },
})
