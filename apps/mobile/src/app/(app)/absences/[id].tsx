import { useQuery } from '@tanstack/react-query'
import { absencesQueryOptions, useSubmitJustification } from '@madrasti/shared/features/attendance/queries'
import { formatDate } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import * as DocumentPicker from 'expo-document-picker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, TextInput } from 'react-native'
import { Button, Label, ListRow, Card, Screen, Section } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { inputAlign, useTheme } from '@/lib/theme'

type Picked = { uri: string; name: string; mimeType?: string }

/** Le parent explique l'absence et joint un justificatif (PDF ou photo du certificat). */
export default function JustifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const c = useTheme()
  const { student } = useFamily()
  const { data: absences = [] } = useQuery({ ...absencesQueryOptions(student?.id), enabled: !!student })
  const absence = absences.find((a) => a.id === Number(id))
  const submit = useSubmitJustification()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<Picked>()

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true })
    if (!result.canceled) setFile(result.assets[0])
  }

  const send = () => {
    // React Native envoie un fichier en multipart sous la forme { uri, name, type }.
    const upload = file && ({ uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob)
    submit.mutate({ id: Number(id), note: note.trim(), file: upload }, {
      onSuccess: () => {
        Alert.alert(t('Justificatif envoyé à l\'école'))
        router.back()
      },
      onError: (e) => Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined),
    })
  }

  return (
    <Screen refreshable={false}>
      {absence && <Label muted>{absence.kind === 'LATE' ? t('Retard') : t('Absence')} · {formatDate(absence.day)}</Label>}
      <Section title={t('Motif')}>
        <TextInput accessibilityLabel={t('Motif')} multiline maxLength={500} value={note} onChangeText={setNote}
          placeholder={t('Ex. : rendez-vous médical, certificat joint')} placeholderTextColor={c.muted}
          style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.border }]} />
      </Section>
      <Section title={t('Justificatif (facultatif)')}>
        <Card style={{ paddingVertical: 4 }}>
          <ListRow icon={file ? 'document-attach' : 'attach'} title={file?.name ?? t('Joindre un PDF ou une photo')}
            subtitle={t('PDF ou photo, 10 Mo maximum.')} onPress={pick} last />
        </Card>
      </Section>
      <Button label={t('Envoyer')} icon="send" onPress={send} loading={submit.isPending} disabled={!note.trim()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  input: { minHeight: 110, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: 'top', ...inputAlign },
})
