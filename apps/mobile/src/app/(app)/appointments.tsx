import { useQuery } from '@tanstack/react-query'
import { groupByDay, MODE_LABELS, slotsQueryOptions, type Slot, useBookSlot, useCancelSlot } from '@madrasti/shared/features/appointments/api'
import { dateFormat } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Badge, Button, Card, ChildPicker, EmptyState, Label, Loading, Screen, Section } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { inputAlign, useTheme } from '@/lib/theme'

const time = (iso: string) => iso.slice(11, 16)

export default function AppointmentsScreen() {
  const c = useTheme()
  const { student } = useFamily()
  const { data: slots, isPending } = useQuery(slotsQueryOptions)
  const book = useBookSlot()
  const cancel = useCancelSlot()
  const [selected, setSelected] = useState<Slot>()
  const [topic, setTopic] = useState('')
  const day = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' })
  const onError = (e: Error) => Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined)

  if (isPending || !student) return <Loading />
  const mine = (slots ?? []).filter((s) => s.mine)
  const free = (slots ?? []).filter((s) => !s.booked)
  const byTeacher = new Map<string, Slot[]>()
  for (const s of free) byTeacher.set(s.teacherName, [...(byTeacher.get(s.teacherName) ?? []), s])

  const confirmBooking = () => selected && book.mutate({ id: selected.id, studentId: student.id, topic: topic.trim() || undefined }, {
    onSuccess: () => { setSelected(undefined); setTopic(''); Alert.alert(t('Rendez-vous confirmé')) },
    onError,
  })

  return (
    <Screen>
      {mine.length > 0 && (
        <Section title={t('Mes rendez-vous')}>
          {mine.map((s) => (
            <Card key={s.id}>
              <Label style={{ fontWeight: '700' }}>{day.format(new Date(s.startsAt))} · {time(s.startsAt)}</Label>
              <Label muted>{s.teacherName} · {s.studentName}</Label>
              <Badge label={`${t(MODE_LABELS[s.mode])}${s.location ? ` · ${s.location}` : ''}`} />
              <Button label={t('Annuler le rendez-vous')} variant="danger" icon="close" onPress={() => cancel.mutate(s.id, { onError })} />
            </Card>
          ))}
        </Section>
      )}
      <ChildPicker />
      {byTeacher.size === 0 ? <EmptyState icon="calendar-outline" title={t('Aucun créneau disponible')} hint={t('Les enseignants n\'ont pas encore ouvert de créneaux.')} /> : (
        [...byTeacher].map(([teacher, list]) => (
          <Section key={teacher} title={teacher}>
            {groupByDay(list).map(([date, daySlots]) => (
              <Card key={date}>
                <Label style={{ fontWeight: '700' }}>{day.format(new Date(`${date}T12:00:00`))}</Label>
                <Badge label={`${t(MODE_LABELS[daySlots[0].mode])}${daySlots[0].location ? ` · ${daySlots[0].location}` : ''}`} tone="muted" />
                <View style={styles.times}>
                  {daySlots.map((s) => {
                    const active = selected?.id === s.id
                    return (
                      <Pressable key={s.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setSelected(active ? undefined : s)}
                        style={[styles.time, { borderColor: c.primary, backgroundColor: active ? c.primary : 'transparent' }]}>
                        <Text style={{ color: active ? c.primaryText : c.primary, fontWeight: '700' }}>{time(s.startsAt)}</Text>
                      </Pressable>
                    )
                  })}
                </View>
                {selected && daySlots.some((s) => s.id === selected.id) && (
                  <View style={{ gap: 10 }}>
                    <TextInput accessibilityLabel={t('Sujet (optionnel)')} placeholder={t('Sujet (optionnel)')} placeholderTextColor={c.muted} value={topic} onChangeText={setTopic}
                      maxLength={300} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]} />
                    <Button label={t('Réserver ce créneau')} icon="checkmark" onPress={confirmBooking} loading={book.isPending} />
                  </View>
                )}
              </Card>
            ))}
          </Section>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  time: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, ...inputAlign },
})
