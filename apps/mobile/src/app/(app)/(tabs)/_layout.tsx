import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { unreadCountQueryOptions } from '@madrasti/shared/features/messaging/queries'
import { Tabs } from 'expo-router'
import type { ColorValue } from 'react-native'
import type { IconName } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={typeof color === 'string' ? color : undefined} size={size} />

export default function TabsLayout() {
  const c = useTheme()
  const { data: unread } = useQuery(unreadCountQueryOptions)
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: c.primary,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
      headerStyle: { backgroundColor: c.background },
      headerTitleStyle: { color: c.text },
      headerShadowVisible: false,
    }}>
      <Tabs.Screen name="index" options={{ title: t('Accueil'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="results" options={{ title: t('Résultats'), tabBarIcon: icon('school') }} />
      <Tabs.Screen name="homework" options={{ title: t('Devoirs'), tabBarIcon: icon('book') }} />
      <Tabs.Screen name="messages" options={{
        title: t('Messagerie'), tabBarIcon: icon('chatbubbles'),
        tabBarBadge: unread || undefined,
      }} />
      <Tabs.Screen name="more" options={{ title: t('Plus'), tabBarIcon: icon('grid') }} />
    </Tabs>
  )
}
