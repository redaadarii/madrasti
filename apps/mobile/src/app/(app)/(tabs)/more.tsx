import { ROLE_LABELS } from '@madrasti/shared/types'
import { type Href, router } from 'expo-router'
import { Alert } from 'react-native'
import { Badge, Button, Card, type IconName, Label, ListRow, Screen, Section, type Tone, Title } from '@/components/ui'
import { useAuth, useUser } from '@/lib/auth'
import { changeLanguage, LANGUAGES, t } from '@/lib/i18n'
import i18n from '@/lib/i18n'

interface Entry { href: Href; icon: IconName; tone: Tone; label: string; parentOnly?: boolean }

const ENTRIES: Entry[] = [
  { href: '/absences', icon: 'calendar-clear', tone: 'coral', label: 'Absences' },
  { href: '/timetable', icon: 'time', tone: 'primary', label: 'Emploi du temps' },
  { href: '/behavior', icon: 'sparkles', tone: 'mint', label: 'Comportement' },
  { href: '/payments', icon: 'wallet', tone: 'mint', label: 'Paiements', parentOnly: true },
  { href: '/appointments', icon: 'calendar', tone: 'primary', label: 'Rendez-vous', parentOnly: true },
  { href: '/canteen', icon: 'restaurant', tone: 'sun', label: 'Cantine' },
  { href: '/polls', icon: 'stats-chart', tone: 'primary', label: 'Sondages' },
  { href: '/notifications', icon: 'notifications', tone: 'coral', label: 'Notifications' },
]

export default function MoreScreen() {
  const user = useUser()
  const { logout } = useAuth()
  const entries = ENTRIES.filter((e) => !e.parentOnly || user.role === 'PARENT')

  const pickLanguage = async (code: (typeof LANGUAGES)[number]['code']) => {
    if (await changeLanguage(code)) {
      Alert.alert(t('Langue modifiée'), t('Le sens de lecture sera appliqué au prochain lancement de l\'application.'))
    }
  }

  return (
    <Screen>
      <Card>
        <Title>{user.firstName} {user.lastName}</Title>
        <Label muted>{user.email}</Label>
        <Badge label={t(ROLE_LABELS[user.role])} />
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        {entries.map((e, i) => (
          <ListRow key={e.label} icon={e.icon} tone={e.tone} title={t(e.label)} last={i === entries.length - 1} onPress={() => router.push(e.href)} />
        ))}
      </Card>
      <Section title={t('Langue')}>
        <Card style={{ paddingVertical: 4 }}>
          {LANGUAGES.map((l, i) => (
            <ListRow key={l.code} icon={i18n.language === l.code ? 'radio-button-on' : 'radio-button-off'} tone={i18n.language === l.code ? 'primary' : 'muted'}
              title={l.label} last={i === LANGUAGES.length - 1} onPress={() => void pickLanguage(l.code)} />
          ))}
        </Card>
      </Section>
      <Button label={t('Se déconnecter')} icon="log-out-outline" variant="danger" onPress={() => void logout()} />
    </Screen>
  )
}
