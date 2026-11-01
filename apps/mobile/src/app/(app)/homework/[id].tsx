import { useQuery } from '@tanstack/react-query'
import { assignmentsQueryOptions, useSubmitHomework } from '@madrasti/shared/features/homework/queries'
import { HOMEWORK_STATUS_LABELS, homeworkStatus, todayIso } from '@madrasti/shared/features/homework/status'
import { formatDate } from '@madrasti/shared/format'
import { ApiError } from '@madrasti/shared/http'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, StyleSheet, TextInput } from 'react-native'
import { Badge, Button, Card, EmptyState, Label, Loading, Screen, Section, Title } from '@/components/ui'
import { useUser } from '@/lib/auth'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { inputAlign, useTheme } from '@/lib/theme'
import { HOMEWORK_TONES } from '@/lib/tones'

/** Énoncé du devoir ; l'élève y rend sa copie, le parent consulte la correction. */
export default function HomeworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useUser()
  const { student } = useFamily()
  const c = useTheme()
  const { data: assignments, isPending } = useQuery({ ...assignmentsQueryOptions({ studentId: student?.id }), enabled: !!student })
  const submit = useSubmitHomework()
  const [content, setContent] = useState('')

  if (isPending || !student) return <Loading />
  const assignment = assignments?.find((a) => a.id === Number(id))
  if (!assignment) return <Screen><EmptyState icon="book-outline" title={t('Devoir introuvable')} /></Screen>
  const status = homeworkStatus(assignment, todayIso())
  const submission = assignment.submission

  const send = () => submit.mutate({ id: assignment.id, content: content.trim() }, {
    onSuccess: () => setContent(''),
    onError: (e) => Alert.alert(t('Une erreur est survenue'), e instanceof ApiError ? e.message : undefined),
  })

  return (
    <Screen>
      <Badge label={t(HOMEWORK_STATUS_LABELS[status])} tone={HOMEWORK_TONES[status]} />
      <Title>{assignment.title}</Title>
      <Label muted>{assignment.subject} · {assignment.teacherName} · {t('pour le {{date}}', { date: formatDate(assignment.dueDate) })}</Label>
      <Card><Label>{assignment.description}</Label></Card>

      {submission ? (
        <Section title={t('Copie rendue')}>
          <Card>
            <Label>{submission.content}</Label>
            <Label muted style={{ fontSize: 12 }}>{t('Rendu le {{date}}', { date: formatDate(submission.submittedAt) })}{submission.late ? ` · ${t('en retard')}` : ''}</Label>
          </Card>
          {submission.score != null && (
            <Card style={{ backgroundColor: c.mintSoft, borderWidth: 0 }}>
              <Label style={{ fontWeight: '800', fontSize: 20, color: c.mint }}>{submission.score}/20</Label>
              {submission.feedback && <Label>{submission.feedback}</Label>}
            </Card>
          )}
        </Section>
      ) : user.role === 'STUDENT' ? (
        <Section title={t('Ma réponse')}>
          <TextInput accessibilityLabel={t('Ma réponse')} multiline value={content} onChangeText={setContent}
            style={[styles.answer, { color: c.text, backgroundColor: c.card, borderColor: c.border }]} placeholder={t('Rédigez votre réponse…')} placeholderTextColor={c.muted} />
          <Button label={t('Rendre le devoir')} icon="send" onPress={send} loading={submit.isPending} disabled={!content.trim()} />
        </Section>
      ) : (
        <EmptyState icon="hourglass-outline" title={t('Pas encore rendu')} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  answer: { minHeight: 160, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 16, textAlignVertical: 'top', ...inputAlign },
})
