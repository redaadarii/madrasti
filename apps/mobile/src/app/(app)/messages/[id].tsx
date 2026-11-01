import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { threadQueryOptions, useReply } from '@madrasti/shared/features/messaging/queries'
import { dateFormat } from '@madrasti/shared/format'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Loading } from '@/components/ui'
import { t } from '@/lib/i18n'
import { inputAlign, useTheme } from '@/lib/theme'

/** Fil de discussion : ouvrir le fil le marque comme lu ; nouveaux messages récupérés régulièrement. */
export default function ThreadScreen() {
  const { id, subject } = useLocalSearchParams<{ id: string; subject?: string }>()
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { data: messages, isPending } = useQuery(threadQueryOptions(Number(id)))
  const reply = useReply(Number(id))
  const [body, setBody] = useState('')
  const list = useRef<FlatList>(null)
  const time = dateFormat({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const send = () => {
    const text = body.trim()
    if (!text) return
    reply.mutate(text, { onSuccess: () => setBody('') })
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: subject ?? '' }} />
      {isPending ? <Loading /> : (
        <FlatList ref={list} data={messages} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 16, gap: 10 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine
              ? { alignSelf: 'flex-end', backgroundColor: c.primary }
              : { alignSelf: 'flex-start', backgroundColor: c.card, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }]}>
              {!item.mine && <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>{item.senderName}</Text>}
              <Text style={{ color: item.mine ? c.primaryText : c.text, fontSize: 15 }}>{item.body}</Text>
              <Text style={{ color: item.mine ? c.primaryText : c.muted, opacity: 0.8, fontSize: 11 }}>{time.format(new Date(item.createdAt))}</Text>
            </View>
          )} />
      )}
      <View style={[styles.composer, { borderTopColor: c.border, backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput accessibilityLabel={t('Votre message')} placeholder={t('Votre message')} placeholderTextColor={c.muted} value={body} onChangeText={setBody}
          multiline style={[styles.input, { color: c.text, backgroundColor: c.background }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={t('Envoyer')} onPress={send} disabled={!body.trim() || reply.isPending}
          style={[styles.send, { backgroundColor: c.primary, opacity: body.trim() ? 1 : 0.4 }]}>
          <Ionicons name="send" size={18} color={c.primaryText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, ...inputAlign },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
})
