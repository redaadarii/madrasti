import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CheckCircle2, Clock, Download, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PaymentStatusBadge } from '@/components/shared/badges'
import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatCurrency, formatDate } from '@madrasti/shared/format'
import { COUNTER_METHODS, PAYMENT_METHOD_LABELS, type Payment, type PaymentStatus } from '@madrasti/shared/features/payments/api'

const STATUS_CSV: Record<PaymentStatus, string> = { PAID: 'Payé', PENDING: 'À venir', OVERDUE: 'En retard' }

function exportPayments(rows: Payment[]) {
  downloadCsv(`madrasti-paiements-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, [
    { header: t('Élève'), value: (p) => p.studentName },
    { header: t('Classe'), value: (p) => p.classroomName },
    { header: t('Libellé'), value: (p) => p.label },
    { header: t('Montant (MAD)'), value: (p) => String(p.amount).replace('.', ',') },
    { header: t('Échéance'), value: (p) => p.dueDate },
    { header: t('Payé le'), value: (p) => p.paidAt },
    { header: t('Moyen'), value: (p) => (p.method ? t(PAYMENT_METHOD_LABELS[p.method]) : '') },
    { header: t('Statut'), value: (p) => t(STATUS_CSV[p.status]) },
  ]))
}
import { paymentsQueryOptions, useMarkPaid } from '@madrasti/shared/features/payments/queries'
import { t } from '@/i18n'

type Filter = PaymentStatus | 'ALL'

export function PaymentsPage() {
  const { data: payments } = useSuspenseQuery(paymentsQueryOptions)
  const [filter, setFilter] = useState<Filter>('ALL')
  const markPaid = useMarkPaid()

  const totals = useMemo(() => {
    const sum = (status: PaymentStatus) =>
      payments.filter((p) => p.status === status).reduce((total, p) => total + p.amount, 0)
    return { PAID: sum('PAID'), PENDING: sum('PENDING'), OVERDUE: sum('OVERDUE') }
  }, [payments])

  const visible = filter === 'ALL' ? payments : payments.filter((p) => p.status === filter)

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" onClick={() => exportPayments(visible)}><Download /> {t('Exporter (CSV)')}</Button>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('Encaissé')} value={formatCurrency(totals.PAID)} icon={CheckCircle2} tone="mint" />
        <StatCard label={t('À venir')} value={formatCurrency(totals.PENDING)} icon={Clock} tone="sun" />
        <StatCard label={t('En retard')} value={formatCurrency(totals.OVERDUE)} icon={AlertCircle} tone="coral" />
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="ALL">{t('Tous')}</TabsTrigger>
          <TabsTrigger value="OVERDUE">{t('En retard')}</TabsTrigger>
          <TabsTrigger value="PENDING">{t('À venir')}</TabsTrigger>
          <TabsTrigger value="PAID">{t('Payés')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-4">{t('Élève')}</TableHead>
              <TableHead>{t('Libellé')}</TableHead>
              <TableHead>{t('Échéance')}</TableHead>
              <TableHead className="text-end">{t('Montant')}</TableHead>
              <TableHead>{t('Statut')}</TableHead>
              <TableHead className="w-32"><span className="sr-only">{t('Actions')}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="ps-4">
                  <Link to="/students/$studentId" params={{ studentId: payment.studentId }} className="font-medium hover:underline">
                    {payment.studentName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{payment.classroomName}</p>
                </TableCell>
                <TableCell>{payment.label}</TableCell>
                <TableCell>{formatDate(payment.dueDate)}</TableCell>
                <TableCell className="text-end font-semibold tabular-nums">{formatCurrency(payment.amount)}</TableCell>
                <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
                <TableCell className="text-end">
                  {payment.status !== 'PAID' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="sm" variant="outline" />}>
                        <Wallet /> {t('Encaisser')}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>{t('Moyen de paiement')}</DropdownMenuLabel>
                          {COUNTER_METHODS.map((method) => (
                            <DropdownMenuItem key={method}
                              onClick={() => markPaid.mutate({ id: payment.id, method }, { onSuccess: () => toast.success(t('Paiement encaissé')) })}>
                              {t(PAYMENT_METHOD_LABELS[method])}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
