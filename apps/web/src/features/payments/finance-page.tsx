import { Suspense, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExpensesTab } from '@/features/expenses/expenses-tab'
import { FinanceReportTab } from '@/features/expenses/finance-report-tab'
import { t } from '@/i18n'
import { PaymentsPage } from './payments-page'

type Tab = 'payments' | 'expenses' | 'report'

/** Finance : encaissements des familles, décaissements de l'école et rapport annuel. */
export function FinancePage() {
  const [tab, setTab] = useState<Tab>('payments')
  return (
    <>
      <PageHeader title={t('Finance')} description={t('Encaissements, dépenses et rapport financier de l\'établissement.')} />
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="mb-6">
        <TabsList>
          <TabsTrigger value="payments">{t('Encaissements')}</TabsTrigger>
          <TabsTrigger value="expenses">{t('Dépenses')}</TabsTrigger>
          <TabsTrigger value="report">{t('Rapport')}</TabsTrigger>
        </TabsList>
      </Tabs>
      {/* Chaque onglet charge ses données : le squelette reste local à l'onglet. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        {tab === 'payments' && <PaymentsPage />}
        {tab === 'expenses' && <ExpensesTab />}
        {tab === 'report' && <FinanceReportTab />}
      </Suspense>
    </>
  )
}
