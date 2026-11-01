import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { inboxQueryOptions } from '@madrasti/shared/features/messaging/queries'
import { dateFormat } from '@madrasti/shared/format'
import { router, Stack } from 'expo-router'
import { Pressable } from 'react-native'
import { Card, EmptyState, Label, ListRow, Loading, Screen } from '@/components/ui'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

export default function MessagesScreen() {
  const c = useTheme()
  const { data: inbox, isPending } = useQuery(inboxQueryOptions)
  const when = dateFormat({ day: 'numeric', month: 'short' })
  return (
    <>
      <Stack.Screen options={{
        headerRight: () => (
          <Pressable accessibilityRole="button" accessibilityLabel={t('Nouveau message')} onPress={() => router.push('/messages/new')} style={{ paddingHorizontal: 12 }}>
            <Ionicons name="create-outline" size={24} color={c.primary} />
          </Pressable>
        ),
      }} />
      <Screen>
        {isPending ? <Loading /> : !inbox?.length ? (
          <EmptyState icon="chatbubbles-outline" title={t('Aucune conversation')} hint={t('Écrivez à l\'équipe pédagogique avec le bouton en haut.')} />
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {inbox.map((conv, i) => (
              <ListRow key={conv.id} icon={conv.unread ? 'mail-unread' : 'mail-open-outline'} tone={conv.unread ? 'coral' : 'muted'}
                title={conv.subject} last={i === inbox.length - 1}
                subtitle={`${conv.participants.map((p) => p.name).join(', ')} · ${conv.lastMessagePreview}`}
                trailing={<Label muted style={{ fontSize: 12 }}>{when.format(new Date(conv.lastMessageAt))}</Label>}
                onPress={() => router.push({ pathname: '/messages/[id]', params: { id: conv.id, subject: conv.subject } })} />
            ))}
          </Card>
        )}
      </Screen>
    </>
  )
}
