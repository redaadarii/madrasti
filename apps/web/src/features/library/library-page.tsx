import { useQuery } from '@tanstack/react-query'
import { BookMarked, Library, Pencil, Plus, Search, Undo2 } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { useFamilyStudent } from '@/features/students/child-picker'
import { formatDate } from '@madrasti/shared/format'
import { MANAGER_ROLES, STAFF_ROLES } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import { type Book, booksQueryOptions, type LoanStatus, loansQueryOptions, useReturnLoan } from '@madrasti/shared/features/library/api'
import { BookDialog, LendDialog } from './library-dialogs'
import { t } from '@/i18n'

const COVERS = ['from-primary to-chart-5', 'from-coral to-sun', 'from-mint to-primary', 'from-sun to-coral', 'from-chart-5 to-mint']
const LOAN_TONES: Record<LoanStatus, string> = {
  ACTIVE: 'bg-secondary text-secondary-foreground',
  OVERDUE: 'bg-destructive/10 text-destructive',
  RETURNED: 'bg-mint/30 text-mint-foreground',
}
const LOAN_LABELS: Record<LoanStatus, string> = { ACTIVE: 'En cours', OVERDUE: 'En retard', RETURNED: 'Rendu' }

export function LibraryPage() {
  const user = useCurrentUser()
  const isStaff = STAFF_ROLES.includes(user.role)
  const isManager = MANAGER_ROLES.includes(user.role)
  const family = useFamilyStudent()
  const [tab, setTab] = useState<'catalog' | 'loans'>('catalog')
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search)
  const { data: books = [] } = useQuery(booksQueryOptions(q))
  const { data: loans = [] } = useQuery({ ...loansQueryOptions(family.student?.id), enabled: isStaff || !!family.student })
  const giveBack = useReturnLoan()
  const [editing, setEditing] = useState<{ open: boolean; book?: Book }>({ open: false })
  const [lending, setLending] = useState<Book | null>(null)

  return (
    <>
      <PageHeader title={t('Bibliothèque')} description={t('Catalogue de l\'école, disponibilités et emprunts.')}
        actions={<>{family.picker}{isManager && <Button onClick={() => setEditing({ open: true })}><Plus /> {t('Ajouter un livre')}</Button>}</>} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'catalog' | 'loans')} className="mb-4">
        <TabsList>
          <TabsTrigger value="catalog">{t('Catalogue')}</TabsTrigger>
          <TabsTrigger value="loans">{isStaff ? t('Emprunts en cours') : t('Mes emprunts')} ({loans.filter((l) => l.status !== 'RETURNED').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'catalog' ? (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="ps-9" aria-label={t('Rechercher un livre')} placeholder={t('Titre, auteur ou catégorie…')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {books.length === 0 ? <EmptyState icon={Library} title={t('Aucun livre trouvé')} /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book) => (
                <Card key={book.id} className="gap-0 overflow-hidden py-0">
                  <div className={cn('flex h-28 items-end bg-gradient-to-br p-4', COVERS[book.id % COVERS.length])}>
                    <BookMarked className="size-6 text-white/90" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <Badge variant="outline" className="w-fit">{book.category}</Badge>
                    <p className="font-heading text-lg leading-tight font-semibold">{book.title}</p>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className={cn('text-sm font-medium', book.available === 0 ? 'text-destructive' : 'text-mint-foreground')}>
                        {book.available === 0 ? t('Indisponible') : t('{{available}}/{{copies}} disponibles', { available: book.available, copies: book.copies })}
                      </span>
                      <div className="flex gap-1">
                        {isStaff && <Button size="sm" variant="outline" disabled={book.available === 0} onClick={() => setLending(book)}>{t('Prêter')}</Button>}
                        {isManager && <Button size="icon-sm" variant="ghost" aria-label={t('Modifier {{name}}', { name: book.title })} onClick={() => setEditing({ open: true, book })}><Pencil /></Button>}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : loans.length === 0 ? (
        <EmptyState icon={BookMarked} title={t('Aucun emprunt')} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">{t('Livre')}</TableHead>
                {isStaff && <TableHead>{t('Élève')}</TableHead>}
                <TableHead>{t('Emprunté le')}</TableHead>
                <TableHead>{t('À rendre le')}</TableHead>
                <TableHead>{t('Statut')}</TableHead>
                {isStaff && <TableHead className="w-28"><span className="sr-only">{t('Actions')}</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="ps-4 font-medium">{loan.bookTitle}</TableCell>
                  {isStaff && <TableCell>{loan.studentName} <span className="text-xs text-muted-foreground">· {loan.classroomName}</span></TableCell>}
                  <TableCell>{formatDate(loan.borrowedOn)}</TableCell>
                  <TableCell>{formatDate(loan.dueOn)}</TableCell>
                  <TableCell><Badge className={cn('border-0', LOAN_TONES[loan.status])}>{t(LOAN_LABELS[loan.status])}</Badge></TableCell>
                  {isStaff && (
                    <TableCell>
                      {loan.status !== 'RETURNED' && (
                        <Button size="sm" variant="outline" onClick={() => giveBack.mutate(loan.id, { onSuccess: () => toast.success(t('Retour enregistré')) })}>
                          <Undo2 /> {t('Retour')}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <BookDialog state={editing} onOpenChange={(open) => setEditing((s) => ({ ...s, open }))} />
      <LendDialog key={lending?.id ?? 'none'} book={lending} onClose={() => setLending(null)} />
    </>
  )
}
