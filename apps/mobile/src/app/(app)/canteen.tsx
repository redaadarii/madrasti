import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { addDays, weekQueryOptions } from '@madrasti/shared/features/canteen/api'
import { dateFormat } from '@madrasti/shared/format'
import { useState } from 'react'
import { I18nManager, Pressable, StyleSheet, View } from 'react-native'
import { Card, Label, Loading, Screen, Title } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const todayIso = () => new Date().toLocaleDateString('en-CA')

export default function CanteenScreen() {
  const c = useTheme()
  const [today] = useState(todayIso)
  const [anchor, setAnchor] = useState(today)
  const { data: week, isPending } = useQuery(weekQueryOptions(anchor))
  const dayLabel = dateFormat({ weekday: 'long', day: 'numeric', month: 'long' })
  const back = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back'
  const next = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Semaine précédente')} onPress={() => setAnchor(addDays(week?.monday ?? anchor, -7))} style={styles.navButton}>
          <Ionicons name={back} size={22} color={c.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setAnchor(today)} style={{ flex: 1, alignItems: 'center' }}>
          <Label style={{ fontWeight: '700' }}>{week ? t('Semaine du {{date}}', { date: dateFormat({ day: 'numeric', month: 'long' }).format(new Date(`${week.monday}T12:00:00`)) }) : ''}</Label>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Semaine suivante')} onPress={() => setAnchor(addDays(week?.monday ?? anchor, 7))} style={styles.navButton}>
          <Ionicons name={next} size={22} color={c.primary} />
        </Pressable>
      </View>
      {isPending || !week ? <Loading /> : Array.from({ length: 5 }, (_, i) => addDays(week.monday, i)).map((date) => {
        const menu = week.menus.find((m) => m.date === date)
        const label = dayLabel.format(new Date(`${date}T12:00:00`))
        return (
          <Card key={date} style={date === today ? { borderColor: c.primary, borderWidth: 1.5 } : undefined}>
            <Title style={{ fontSize: 17 }}>{label.charAt(0).toLocaleUpperCase() + label.slice(1)}</Title>
            {menu ? (
              <>
                {menu.starter && <Course label={t('Entrée')} value={menu.starter} />}
                <Course label={t('Plat')} value={menu.mainCourse} strong />
                {menu.side && <Course label={t('Accompagnement')} value={menu.side} />}
                {menu.dessert && <Course label={t('Dessert')} value={menu.dessert} />}
                {menu.vegetarian && <Label style={{ color: c.mint }}>🌿 {menu.vegetarian}</Label>}
                {menu.allergens && <Label muted style={{ fontSize: 12 }}>⚠️ {t('Allergènes : {{list}}', { list: menu.allergens })}</Label>}
              </>
            ) : <Label muted>{t('Menu non publié')}</Label>}
          </Card>
        )
      })}
    </Screen>
  )
}

function Course({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View>
      <Label muted style={{ fontSize: 11, fontWeight: '700' }}>{label.toLocaleUpperCase()}</Label>
      <Label style={strong ? { fontWeight: '700' } : undefined}>{value}</Label>
    </View>
  )
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center' },
  navButton: { padding: 8 },
})
