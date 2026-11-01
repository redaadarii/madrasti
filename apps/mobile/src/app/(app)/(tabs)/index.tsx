import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { announcementsQueryOptions } from '@madrasti/shared/features/announcements/queries'
import { absencesQueryOptions } from '@madrasti/shared/features/attendance/queries'
import { studentGradesQueryOptions } from '@madrasti/shared/features/grades/queries'
import { assignmentsQueryOptions } from '@madrasti/shared/features/homework/queries'
import { homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { unreadNotificationsQueryOptions } from '@madrasti/shared/features/notifications/api'
import { studentPaymentsQueryOptions } from '@madrasti/shared/features/payments/queries'
import { formatCurrency, formatDate, scoreOutOf20 } from '@madrasti/shared/format'
import { Link, router, Stack } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Card, ChildPicker, EmptyState, type IconName, Label, ListRow, Loading, Screen, Section, type Tone } from '@/components/ui'
import { useUser } from '@/lib/auth'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

/** Accueil : l'essentiel de l'élève (ou de l'enfant choisi) en un coup d'œil. */
export default function HomeScreen() {
  const user = useUser()
  const { student } = useFamily()
  const c = useTheme()
  const { data: unread = 0 } = useQuery(unreadNotificationsQueryOptions)

  return (
    <>
      <Stack.Screen options={{
        headerRight: () => (
          <Pressable accessibilityRole="button" accessibilityLabel={t('Notifications')} onPress={() => router.push('/notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={24} color={c.text} />
            {unread > 0 && <View style={[styles.dot, { backgroundColor: c.coral }]}><Text style={styles.dotText}>{unread > 9 ? '9+' : unread}</Text></View>}
          </Pressable>
        ),
      }} />
      <Screen>
        <View>
          <Label muted>{t('Bonjour')}</Label>
          <Text style={[styles.hello, { color: c.text }]}>{user.firstName}</Text>
        </View>
        <ChildPicker />
        {student ? <StudentOverview studentId={student.id} classroomName={student.classroomName} name={`${student.firstName} ${student.lastName}`} /> : <Loading />}
        <Announcements />
      </Screen>
    </>
  )
}

function StudentOverview({ studentId, name, classroomName }: { studentId: number; name: string; classroomName: string }) {
  const { data: grades = [] } = useQuery(studentGradesQueryOptions(studentId))
  const { data: absences = [] } = useQuery(absencesQueryOptions(studentId))
  const { data: assignments = [] } = useQuery(assignmentsQueryOptions({ studentId }))
  const { data: payments = [] } = useQuery(studentPaymentsQueryOptions(studentId))
  const today = todayIso()

  const average = grades.length ? grades.reduce((sum, g) => sum + scoreOutOf20(g.score, g.maxScore), 0) / grades.length : null
  const unjustified = absences.filter((a) => !a.justified).length
  const todo = assignments.filter((a) => ['TODO', 'LATE'].includes(homeworkStatus(a, today)))
  const due = payments.filter((p) => p.status !== 'PAID')
  const dueTotal = due.reduce((sum, p) => sum + p.amount, 0)

  return (
    <>
      <Card style={{ backgroundColor: '#1e3a8a', borderWidth: 0 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{name}</Text>
        <Text style={{ color: '#e5e1ff' }}>{classroomName}</Text>
      </Card>
      <View style={styles.stats}>
        <Stat icon="trending-up" tone="primary" label={t('Moyenne')} value={average == null ? '—' : average.toFixed(2)} href="/results" />
        <Stat icon="book" tone="sun" label={t('Devoirs à rendre')} value={String(todo.length)} href="/homework" />
        <Stat icon="calendar-clear" tone="coral" label={t('Absences à justifier')} value={String(unjustified)} href="/absences" />
        <Stat icon="wallet" tone="mint" label={t('À régler')} value={dueTotal ? formatCurrency(dueTotal) : '0'} href="/payments" />
      </View>

      <Section title={t('Prochains devoirs')}>
        {todo.length === 0 ? <EmptyState icon="checkmark-done" title={t('Aucun devoir en attente 🎉')} /> : (
          <Card style={{ paddingVertical: 4 }}>
            {todo.slice(0, 3).map((a, i, list) => (
              <ListRow key={a.id} icon="book-outline" tone="sun" title={a.title} last={i === list.length - 1}
                subtitle={`${a.subject} · ${t('pour le {{date}}', { date: formatDate(a.dueDate) })}`}
                onPress={() => router.push({ pathname: '/homework/[id]', params: { id: a.id } })} />
            ))}
          </Card>
        )}
      </Section>

      {grades.length > 0 && (
        <Section title={t('Dernières notes')}>
          <Card style={{ paddingVertical: 4 }}>
            {grades.slice(0, 3).map((g, i, list) => (
              <ListRow key={g.id} icon="ribbon-outline" title={`${g.subject} · ${g.title}`} last={i === list.length - 1}
                trailing={<Label style={{ fontWeight: '700' }}>{g.score}/{g.maxScore}</Label>} />
            ))}
          </Card>
        </Section>
      )}
    </>
  )
}

function Stat({ icon, tone, label, value, href }: { icon: IconName; tone: Tone; label: string; value: string; href: '/results' | '/homework' | '/absences' | '/payments' }) {
  const c = useTheme()
  const color = { primary: c.primary, sun: c.sun, coral: c.coral, mint: c.mint, danger: c.danger, muted: c.muted }[tone]
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="button" style={StyleSheet.flatten([styles.stat, { backgroundColor: c.card, borderColor: c.border }])}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={2}>{label}</Text>
      </Pressable>
    </Link>
  )
}

function Announcements() {
  const { data: announcements = [] } = useQuery(announcementsQueryOptions(3))
  if (announcements.length === 0) return null
  return (
    <Section title={t('Annonces')}>
      {announcements.map((a) => (
        <Card key={a.id}>
          <Label style={{ fontWeight: '700' }}>{a.pinned ? '📌 ' : ''}{a.title}</Label>
          <Label muted numberOfLines={4}>{a.content}</Label>
          <Label muted style={{ fontSize: 12 }}>{a.authorName} · {formatDate(a.createdAt)}</Label>
        </Card>
      ))}
    </Section>
  )
}

const styles = StyleSheet.create({
  hello: { fontSize: 28, fontWeight: '800' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexBasis: '47%', flexGrow: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  bell: { paddingHorizontal: 12 },
  dot: { position: 'absolute', top: -4, end: 6, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
})
