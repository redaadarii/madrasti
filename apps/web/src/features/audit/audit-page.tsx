import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ScrollText, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { t } from '@/i18n'
import { api } from '@/lib/api-client'
import { dateFormat } from '@madrasti/shared/format'
import type { Page } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import { AUDIT_ACTION_LABELS, type AuditAction } from '@madrasti/shared/features/audit/api'

const SENSITIVE: AuditAction[] = ['LOGIN_FAILED', 'TOKEN_REUSE', 'USER_DELETED', 'STUDENT_DELETED', 'PASSWORD_RESET']

interface AuditEvent {
  id: number
  action: AuditAction
  actorEmail: string | null
  target: string | null
  detail: string | null
  ip: string | null
  createdAt: string
}

const when = dateFormat({ day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Journal d'audit (administrateur) : qui a fait quoi, quand, et d'où. */
export function AuditPage() {
  const [action, setAction] = useState<AuditAction | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDeferredValue(search)
  const { data } = useQuery({
    queryKey: ['audit', action, q, page],
    queryFn: () => api<Page<AuditEvent>>('/admin/audit', { query: { action, q, page, size: 50 } }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader title={t('Journal d\'audit')} description={t('Connexions et actions sensibles : comptes, encaissements, imports, suppressions.')} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={t('Rechercher (email, élément concerné)')} placeholder={t('Rechercher (email, élément concerné)')} className="ps-9"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
        </div>
        <NativeSelect aria-label={t('Action')} value={action} onChange={(e) => { setAction(e.target.value as AuditAction | ''); setPage(0) }}>
          <NativeSelectOption value="">{t('Toutes les actions')}</NativeSelectOption>
          {(Object.keys(AUDIT_ACTION_LABELS) as AuditAction[]).map((a) => (
            <NativeSelectOption key={a} value={a}>{t(AUDIT_ACTION_LABELS[a])}</NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {data && data.content.length === 0 ? (
        <EmptyState icon={ScrollText} title={t('Aucun événement')} />
      ) : data && (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('Date')}</TableHead>
                <TableHead>{t('Action')}</TableHead>
                <TableHead>{t('Par')}</TableHead>
                <TableHead>{t('Élément concerné')}</TableHead>
                <TableHead>{t('Détail')}</TableHead>
                <TableHead>{t('Adresse IP')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="ps-4 whitespace-nowrap tabular-nums">{when.format(new Date(event.createdAt))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(SENSITIVE.includes(event.action) && 'border-destructive/40 text-destructive')}>
                      {t(AUDIT_ACTION_LABELS[event.action])}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.actorEmail ?? '—'}</TableCell>
                  <TableCell>{event.target ?? '—'}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground" title={event.detail ?? undefined}>{event.detail ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{event.ip ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onPageChange={setPage} />
          </div>
        </Card>
      )}
    </>
  )
}
