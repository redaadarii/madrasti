import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, Scale, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/i18n'
import { downloadCsv, toCsv } from '@/lib/csv'
import { dateFormat, formatCurrency } from '@madrasti/shared/format'
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory, financeReportQueryOptions } from '@madrasti/shared/features/expenses/api'

const monthName = (month: number) => dateFormat({ month: 'short' }).format(new Date(2026, month - 1, 1))

export function FinanceReportTab() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const { data: report, isPending } = useQuery(financeReportQueryOptions(year))

  if (isPending || !report) return <Skeleton className="h-96 rounded-2xl" />
  const peak = Math.max(1, ...report.months.flatMap((m) => [m.income, m.expenses]))
  const categories = Object.entries(report.expensesByCategory) as [ExpenseCategory, number][]

  const exportReport = () =>
    downloadCsv(`madrasti-rapport-financier-${year}.csv`, toCsv(report.months, [
      { header: t('Mois'), value: (m) => monthName(m.month) },
      { header: t('Recettes'), value: (m) => String(m.income).replace('.', ',') },
      { header: t('Dépenses'), value: (m) => String(m.expenses).replace('.', ',') },
      { header: t('Solde'), value: (m) => String(m.balance).replace('.', ',') },
    ]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={t('Année précédente')} onClick={() => setYear((y) => y - 1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
          <span className="font-heading text-xl font-semibold tabular-nums">{year}</span>
          <Button variant="ghost" size="icon-sm" aria-label={t('Année suivante')} onClick={() => setYear((y) => y + 1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
        </div>
        <Button variant="outline" onClick={exportReport}><Download /> {t('Exporter (CSV)')}</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('Recettes')} value={formatCurrency(report.totalIncome)} icon={TrendingUp} tone="mint" />
        <StatCard label={t('Dépenses')} value={formatCurrency(report.totalExpenses)} icon={TrendingDown} tone="coral" />
        <StatCard label={t('Solde')} value={formatCurrency(report.balance)} icon={Scale} />
        <StatCard label={t('Reste à percevoir')} value={formatCurrency(report.outstanding)} icon={Wallet} tone="sun" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader><CardTitle>{t('Recettes et dépenses par mois')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-56 items-end gap-2" role="img" aria-label={t('Recettes et dépenses par mois')}>
              {report.months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-48 w-full items-end justify-center gap-0.5">
                    <div className="w-1/2 rounded-t bg-mint" style={{ height: `${(m.income / peak) * 100}%` }}
                      title={`${t('Recettes')} : ${formatCurrency(m.income)}`} />
                    <div className="w-1/2 rounded-t bg-coral" style={{ height: `${(m.expenses / peak) * 100}%` }}
                      title={`${t('Dépenses')} : ${formatCurrency(m.expenses)}`} />
                  </div>
                  <span className="text-[0.65rem] text-muted-foreground">{monthName(m.month)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-mint" /> {t('Recettes')}</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-coral" /> {t('Dépenses')}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('Dépenses par catégorie')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 && <p className="text-sm text-muted-foreground">{t('Aucune dépense payée cette année.')}</p>}
            {categories.sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
              <div key={category}>
                <div className="flex justify-between text-sm">
                  <span>{t(EXPENSE_CATEGORY_LABELS[category])}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(amount)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(amount / Math.max(1, report.totalExpenses)) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
