import { useQuery } from '@tanstack/react-query'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { MASTERY_LEVELS, masteryInfo, studentCompetenciesQueryOptions } from '@madrasti/shared/features/competencies/api'

/** Volet « compétences » du bulletin (affiché et imprimé sous les moyennes). */
export function CompetencyReport({ studentId, term }: { studentId: number; term: string }) {
  const { data: blocks = [] } = useQuery(studentCompetenciesQueryOptions(studentId, term))
  if (blocks.length === 0) return null
  return (
    <section className="mt-6 break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold">{t('Compétences')}</h2>
        <p className="text-xs text-muted-foreground">
          {MASTERY_LEVELS.map((m) => `${m.short} : ${t(m.label)}`).join(' · ')}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.subject} className="rounded-2xl border p-4">
            <p className="mb-2 font-semibold">{block.subject}</p>
            <ul className="space-y-1.5 text-sm">
              {block.competencies.map((c) => {
                const info = masteryInfo(c.mastery)
                return (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <span>{c.label}</span>
                    <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold', info.className)} title={t(info.label)}>
                      {info.short}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
