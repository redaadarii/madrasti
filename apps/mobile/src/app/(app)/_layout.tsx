import { Stack } from 'expo-router'
import { FamilyProvider } from '@/lib/family'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

/** Espace connecté : onglets, puis écrans de détail empilés par-dessus. */
export default function AppLayout() {
  const c = useTheme()
  return (
    <FamilyProvider>
      <Stack screenOptions={{
        headerTintColor: c.primary,
        headerStyle: { backgroundColor: c.background },
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="messages/[id]" options={{ title: '' }} />
        <Stack.Screen name="messages/new" options={{ title: t('Nouveau message'), presentation: 'modal' }} />
        <Stack.Screen name="homework/[id]" options={{ title: t('Devoir') }} />
        <Stack.Screen name="absences/index" options={{ title: t('Absences') }} />
        <Stack.Screen name="absences/[id]" options={{ title: t('Justifier l\'absence'), presentation: 'modal' }} />
        <Stack.Screen name="timetable" options={{ title: t('Emploi du temps') }} />
        <Stack.Screen name="behavior" options={{ title: t('Comportement') }} />
        <Stack.Screen name="payments" options={{ title: t('Paiements') }} />
        <Stack.Screen name="pay" options={{ title: t('Paiement de démonstration'), presentation: 'modal' }} />
        <Stack.Screen name="canteen" options={{ title: t('Cantine') }} />
        <Stack.Screen name="appointments" options={{ title: t('Rendez-vous') }} />
        <Stack.Screen name="polls" options={{ title: t('Sondages') }} />
        <Stack.Screen name="notifications" options={{ title: t('Notifications') }} />
      </Stack>
    </FamilyProvider>
  )
}
