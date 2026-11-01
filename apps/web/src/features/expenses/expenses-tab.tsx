import { zodResolver } from '@hookform/resolvers/zod'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ArrowRight, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { EmptyState } from '@/components/shared/empty-state'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { todayIso } from '@madrasti/shared/features/homework/status'
import { t } from '@/i18n'
import { formatCurrency, formatDate } from '@madrasti/shared/format'
import { handleFormError } from '@/lib/form'
import { cn } from '@/lib/utils'
import {
  EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_LABELS, type ExpenseCategory, type ExpenseStatus,
  expensesQueryOptions, useDeleteExpense, useMoveExpense, useSaveExpense,
} from '@madrasti/shared/features/expenses/api'

const NEXT: Record<ExpenseStatus, ExpenseStatus | null> = { ORDERED: 'INVOICED', INVOICED: 'PAID', PAID: null }
const NEXT_LABEL: Record<ExpenseStatus, string> = { ORDERED: 'Facture reçue', INVOICED: 'Marquer payé', PAID: '' }
const TONES: Record<ExpenseStatus, string> = {
  ORDERED: 'bg-secondary text-secondary-foreground',
  INVOICED: 'bg-sun/40 text-sun-foreground',
  PAID: 'bg-mint/30 text-mint-foreground',
}

export function ExpensesTab() {
  const { data: expenses } = useSuspenseQuery(expensesQueryOptions)
  const move = useMoveExpense()
  const remove = useDeleteExpense()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setCreating(true)}><Plus /> {t('Nouvelle dépense')}</Button></div>
      {expenses.length === 0 ? <EmptyState icon={ReceiptText} title={t('Aucune dépense')} /> : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('Libellé')}</TableHead>
                <TableHead>{t('Catégorie')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Fournisseur')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Bon / facture')}</TableHead>
                <TableHead className="text-end">{t('Montant')}</TableHead>
                <TableHead>{t('Statut')}</TableHead>
                <TableHead className="w-44"><span className="sr-only">{t('Actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => {
                const next = NEXT[expense.status]
                return (
                  <TableRow key={expense.id}>
                    <TableCell className="ps-4">
                      <p className="font-medium">{expense.label}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(expense.orderedOn)}</p>
                    </TableCell>
                    <TableCell>{t(EXPENSE_CATEGORY_LABELS[expense.category])}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{expense.supplier ?? '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{expense.reference ?? '—'}</TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      <Badge className={cn('border-0', TONES[expense.status])}>{t(EXPENSE_STATUS_LABELS[expense.status])}</Badge>
                      {expense.paidOn && <p className="mt-1 text-xs text-muted-foreground">{formatDate(expense.paidOn)}</p>}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {next && (
                          <Button size="sm" variant="outline" onClick={() => move.mutate({ id: expense.id, status: next })}>
                            {t(NEXT_LABEL[expense.status])} <ArrowRight className="rtl:-scale-x-100" />
                          </Button>
                        )}
                        <Button size="icon-sm" variant="ghost" aria-label={t('Supprimer « {{title}} »', { title: expense.label })}
                          onClick={() => remove.mutate(expense.id, { onSuccess: () => toast.success(t('Dépense supprimée')) })}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <ExpenseDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}

const schema = z.object({
  label: z.string().trim().min(1, 'Libellé requis').max(150),
  category: z.enum(['SALARIES', 'SUPPLIES', 'MAINTENANCE', 'TRANSPORT', 'CANTEEN', 'UTILITIES', 'OTHER']),
  supplier: z.string().trim().max(150).optional().transform((v) => v || null),
  reference: z.string().trim().max(40).optional().transform((v) => v || null),
  amount: z.coerce.number({ error: 'Montant requis' }).positive('Montant requis'),
  orderedOn: z.string().min(1, 'Date requise'),
})

function ExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const save = useSaveExpense()
  const { register, handleSubmit, reset, setError, formState: { errors } } =
    useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ label: '', category: 'SUPPLIES', supplier: '', reference: '', amount: '', orderedOn: todayIso() })
  }, [open, reset])

  const onSubmit = handleSubmit((input) =>
    save.mutate({ input }, {
      onSuccess: () => { toast.success(t('Dépense enregistrée')); onOpenChange(false) },
      onError: (error) => handleFormError(error, setError),
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t('Nouvelle dépense')}</DialogTitle></DialogHeader>
        <form id="expense-form" onSubmit={onSubmit} noValidate>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><TextField label={t('Libellé')} registration={register('label')} error={errors.label} /></div>
            <SelectField label={t('Catégorie')} registration={register('category')}
              options={(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((c) => ({ value: c, label: t(EXPENSE_CATEGORY_LABELS[c]) }))} />
            <TextField label={t('Montant (MAD)')} type="number" min={0} step="0.01" registration={register('amount')} error={errors.amount} />
            <TextField label={t('Fournisseur')} registration={register('supplier')} error={errors.supplier} />
            <TextField label={t('Bon / facture')} placeholder="BC-2026-001" registration={register('reference')} error={errors.reference} />
            <TextField label={t('Date de commande')} type="date" registration={register('orderedOn')} error={errors.orderedOn} />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annuler')}</Button>
          <Button type="submit" form="expense-form" disabled={save.isPending}>{t('Enregistrer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
