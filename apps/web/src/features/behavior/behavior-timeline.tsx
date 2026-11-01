import { useQuery } from '@tanstack/react-query'
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { t } from '@/i18n'
import { formatDate } from '@madrasti/shared/format'
import { cn } from '@/lib/utils'
import { type BehaviorRecord, categoryInfo, SANCTION_LABELS, studentBehaviorQueryOptions } from '@madrasti/shared/features/behavior/api'

/** Bilan et historique du comportement d'un élève (fiche élève, espace famille). */
export function BehaviorTimeline({ studentId }: { studentId: number }) {
  const { data } = useQuery(studentBehaviorQueryOptions(studentId))
  if (!data) return null
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Points positifs')} value={data.positives} icon={ThumbsUp} tone="mint" />
        <StatCard label={t('Incidents')} value={data.incidents} icon={ThumbsDown} tone="coral" />
        <StatCard label={t('Solde de points')} value={data.balance > 0 ? `+${data.balance}` : data.balance} icon={Sparkles} tone="primary" />
      </div>
      {data.records.length === 0
        ? <EmptyState icon={Sparkles} title={t('Aucune observation pour le moment')} />
        : <Card className="py-2"><ul className="divide-y">{data.records.map((r) => <BehaviorItem key={r.id} record={r} />)}</ul></Card>}
    </div>
  )
}

export function BehaviorItem({ record, showStudent = false, action }: { record: BehaviorRecord; showStudent?: boolean; action?: ReactNode }) {
  const info = categoryInfo(record.category)
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <span className="text-xl leading-none" aria-hidden>{info.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {showStudent && <span>{record.studentName} · </span>}
          {t(info.label)}
          {record.sanction && <Badge variant="destructive" className="ms-2">{t(SANCTION_LABELS[record.sanction])}</Badge>}
        </p>
        {record.note && <p className="text-muted-foreground">{record.note}</p>}
        <p className="text-xs text-muted-foreground">
          {formatDate(record.occurredOn)}{record.authorName && ` · ${record.authorName}`}
        </p>
      </div>
      <span className={cn('font-heading text-lg font-semibold tabular-nums', record.positive ? 'text-mint-foreground dark:text-mint' : 'text-destructive')}>
        {record.points > 0 ? `+${record.points}` : record.points}
      </span>
      {action}
    </li>
  )
}
