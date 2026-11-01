import { useQuery } from '@tanstack/react-query'
import { masteryInfo, MASTERY_LEVELS, studentCompetenciesQueryOptions } from '@madrasti/shared/features/competencies/api'
import { studentGradesQueryOptions } from '@madrasti/shared/features/grades/queries'
import { reportCardQueryOptions } from '@madrasti/shared/features/report-card/api'
import { scoreOutOf20 } from '@madrasti/shared/format'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Segmented } from '@/components/segmented'
import { Badge, Card, ChildPicker, EmptyState, Label, ListRow, Loading, Screen, Section, type Tone } from '@/components/ui'
import { useFamily } from '@/lib/family'
import { t } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'

type View_ = 'grades' | 'report' | 'competencies'
const TERMS = ['T1', 'T2', 'T3'] as const
const MASTERY_TONES: Record<string, Tone> = { NOT_ACQUIRED: 'danger', IN_PROGRESS: 'sun', ACQUIRED: 'mint', EXCEEDED: 'primary' }

export default function ResultsScreen() {
  const { student } = useFamily()
  const [view, setView] = useState<View_>('grades')
  const [term, setTerm] = useState<(typeof TERMS)[number]>('T1')
  if (!student) return <Loading />
  return (
    <Screen>
      <ChildPicker />
      <Segmented label={t('Résultats')} value={view} onChange={setView} options={[
        { value: 'grades', label: t('Notes') },
        { value: 'report', label: t('Bulletin') },
        { value: 'competencies', label: t('Compétences') },
      ]} />
      {view !== 'grades' && (
        <Segmented label={t('Trimestre')} value={term} onChange={setTerm}
          options={TERMS.map((tm) => ({ value: tm, label: t('Trimestre {{n}}', { n: tm.slice(1) }) }))} />
      )}
      {view === 'grades' && <Grades studentId={student.id} />}
      {view === 'report' && <ReportCard studentId={student.id} term={term} />}
      {view === 'competencies' && <Competencies studentId={student.id} term={term} />}
    </Screen>
  )
}

function Grades({ studentId }: { studentId: number }) {
  const { data: grades, isPending } = useQuery(studentGradesQueryOptions(studentId))
  if (isPending) return <Loading />
  if (!grades?.length) return <EmptyState icon="ribbon-outline" title={t('Aucune note pour le moment')} />
  const bySubject = new Map<string, typeof grades>()
  for (const g of grades) bySubject.set(g.subject, [...(bySubject.get(g.subject) ?? []), g])
  return [...bySubject].map(([subject, list]) => {
    const average = list.reduce((sum, g) => sum + scoreOutOf20(g.score, g.maxScore), 0) / list.length
    return (
      <Section key={subject} title={subject} action={<Badge label={`${average.toFixed(2)}/20`} tone={average < 10 ? 'danger' : 'mint'} />}>
        <Card style={{ paddingVertical: 4 }}>
          {list.map((g, i) => (
            <ListRow key={g.id} title={g.title} subtitle={g.term} last={i === list.length - 1}
              trailing={<Label style={{ fontWeight: '700' }}>{g.score}/{g.maxScore}</Label>} />
          ))}
        </Card>
      </Section>
    )
  })
}

function ReportCard({ studentId, term }: { studentId: number; term: string }) {
  const c = useTheme()
  const { data: card, isPending } = useQuery(reportCardQueryOptions(studentId, term))
  if (isPending) return <Loading />
  if (!card || card.subjects.length === 0) return <EmptyState icon="document-text-outline" title={t('Pas encore de notes ce trimestre')} />
  return (
    <>
      <View style={styles.highlights}>
        <Highlight label={t('Moyenne générale')} value={card.overallAverage == null ? '—' : `${card.overallAverage}/20`} />
        <Highlight label={t('Rang')} value={card.rank ? `${card.rank} / ${card.classSize}` : '—'} />
      </View>
      {card.mention && <Card style={{ backgroundColor: c.primarySoft, borderWidth: 0 }}><Text style={{ color: c.primary, fontWeight: '700', textAlign: 'center', fontSize: 17 }}>{card.mention}</Text></Card>}
      <Card style={{ paddingVertical: 4 }}>
        {card.subjects.map((s, i) => (
          <ListRow key={s.subject} title={s.subject} last={i === card.subjects.length - 1}
            subtitle={t('Classe : {{avg}}', { avg: s.classAverage })}
            trailing={<Label style={{ fontWeight: '700', color: s.average < 10 ? c.danger : c.text }}>{s.average}</Label>} />
        ))}
      </Card>
      {(card.councilDecision || card.councilAppreciation) && (
        <Section title={t('Conseil de classe')}>
          <Card>
            {card.councilDecision && <Label style={{ fontWeight: '700' }}>{card.councilDecision}</Label>}
            {card.councilAppreciation && <Label muted style={{ fontStyle: 'italic' }}>« {card.councilAppreciation} »</Label>}
          </Card>
        </Section>
      )}
    </>
  )
}

function Highlight({ label, value }: { label: string; value: string }) {
  const c = useTheme()
  return (
    <View style={[styles.highlight, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function Competencies({ studentId, term }: { studentId: number; term: string }) {
  const { data: blocks, isPending } = useQuery(studentCompetenciesQueryOptions(studentId, term))
  if (isPending) return <Loading />
  if (!blocks?.length) return <EmptyState icon="checkmark-circle-outline" title={t('Aucune compétence évaluée ce trimestre')} />
  return (
    <>
      <View style={styles.legend}>
        {MASTERY_LEVELS.map((m) => <Badge key={m.value} label={`${m.short} · ${t(m.label)}`} tone={MASTERY_TONES[m.value]} />)}
      </View>
      {blocks.map((block) => (
        <Section key={block.subject} title={block.subject}>
          <Card style={{ paddingVertical: 4 }}>
            {block.competencies.map((comp, i) => {
              const info = masteryInfo(comp.mastery)
              return <ListRow key={comp.id} title={comp.label} last={i === block.competencies.length - 1}
                trailing={<Badge label={info.short} tone={MASTERY_TONES[comp.mastery]} />} />
            })}
          </Card>
        </Section>
      ))}
    </>
  )
}

const styles = StyleSheet.create({
  highlights: { flexDirection: 'row', gap: 10 },
  highlight: { flex: 1, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})
