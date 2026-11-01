import { useQuery } from '@tanstack/react-query'
import { contactsQueryOptions, useStartConversation } from '@madrasti/shared/features/messaging/queries'
import { ROLE_LABELS } from '@madrasti/shared/types'
import { ApiError } from '@madrasti/shared/http'
import { router } from 'expo-router'
import { useDeferredValue, useState } from 'react'
import { Alert, StyleSheet, TextInput } from 'react-native'
import { Badge, Button, Card, Label, ListRow, Screen, Section } from '@/components/ui'
import { t } from '@/lib/i18n'
import { inputAlign, useTheme } from '@/lib/theme'

/** Nouveau message à un membre de l'équipe (direction, enseignants). */
export default function NewMessageScreen() {
  const c = useTheme()
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search)
  const { data: contacts = [] } = useQuery(contactsQueryOptions(query))
  const [recipient, setRecipient] = useState<{ id: number; name: string }>()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const start = useStartConversation()
  const input = [styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]

  const send = () => {
    if (!recipient) return
    start.mutate({ recipientIds: [recipient.id], subject: subject.trim(), body: body.trim() }, {
      onSuccess: (conv) => router.replace({ pathname: '/messages/[id]', params: { id: conv.id, subject: conv.subject } }),
      onError: (e) => Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined),
    })
  }

  return (
    <Screen refreshable={false}>
      <Section title={t('Destinataire')}>
        {recipient ? (
          <Card style={{ paddingVertical: 4 }}>
            <ListRow icon="person" title={recipient.name} onPress={() => setRecipient(undefined)} last />
          </Card>
        ) : (
          <>
            <TextInput accessibilityLabel={t('Rechercher un destinataire')} placeholder={t('Rechercher un destinataire')} placeholderTextColor={c.muted}
              value={search} onChangeText={setSearch} style={input} />
            <Card style={{ paddingVertical: 4 }}>
              {contacts.slice(0, 8).map((contact, i, list) => (
                <ListRow key={contact.id} icon="person-outline" title={contact.name} last={i === list.length - 1}
                  trailing={<Badge label={t(ROLE_LABELS[contact.role])} tone="muted" />}
                  onPress={() => setRecipient({ id: contact.id, name: contact.name })} />
              ))}
              {contacts.length === 0 && <Label muted style={{ paddingVertical: 12 }}>{t('Aucun résultat')}</Label>}
            </Card>
          </>
        )}
      </Section>
      <Section title={t('Message')}>
        <TextInput accessibilityLabel={t('Objet')} placeholder={t('Objet')} placeholderTextColor={c.muted} value={subject} onChangeText={setSubject} style={input} maxLength={150} />
        <TextInput accessibilityLabel={t('Votre message')} placeholder={t('Votre message')} placeholderTextColor={c.muted} value={body} onChangeText={setBody}
          multiline style={[input, { minHeight: 140, textAlignVertical: 'top' }]} />
      </Section>
      <Button label={t('Envoyer')} icon="send" onPress={send} loading={start.isPending} disabled={!recipient || !subject.trim() || !body.trim()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, ...inputAlign },
})
