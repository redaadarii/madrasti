import { useQuery } from '@tanstack/react-query'
import { KeyRound, MoreHorizontal, Pencil, Plus, Search, Trash2, UserX } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { toast } from 'sonner'
import { RoleBadge } from '@/components/shared/badges'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, initials } from '@madrasti/shared/format'
import { ROLE_LABELS, type Role } from '@madrasti/shared/types'
import type { User } from '@madrasti/shared/features/users/api'
import { useDeleteUser, usersQueryOptions } from '@madrasti/shared/features/users/queries'
import { ResetPasswordDialog } from './reset-password-dialog'
import { UserFormDialog } from './user-form-dialog'
import { t } from '@/i18n'

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [page, setPage] = useState(0)
  const q = useDeferredValue(search)
  const { data, isPending } = useQuery(usersQueryOptions({ q, role: role || undefined, page }))

  const [formState, setFormState] = useState<{ open: boolean; user?: User }>({ open: false })
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const deleteUser = useDeleteUser()

  return (
    <>
      <PageHeader
        title={t('Comptes utilisateurs')}
        description={t('Créez et gérez les accès de la direction, des enseignants, des parents et des élèves.')}
        actions={<Button onClick={() => setFormState({ open: true })}><Plus /> {t('Nouveau compte')}</Button>}
      />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('Rechercher par nom ou email…')} aria-label={t('Rechercher un compte')} className="ps-9"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
          </div>
          <NativeSelect aria-label={t('Filtrer par rôle')} value={role} onChange={(e) => { setRole(e.target.value as Role | ''); setPage(0) }}>
            <NativeSelectOption value="">{t('Tous les rôles')}</NativeSelectOption>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <NativeSelectOption key={r} value={r}>{t(ROLE_LABELS[r])}</NativeSelectOption>)}
          </NativeSelect>
        </div>

        {isPending ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data && data.content.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{t('Utilisateur')}</TableHead>
                  <TableHead>{t('Rôle')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('École')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Créé le')}</TableHead>
                  <TableHead>{t('Statut')}</TableHead>
                  <TableHead className="w-12"><span className="sr-only">{t('Actions')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="ps-4">
                      <div className="flex items-center gap-3">
                        <Avatar><AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><RoleBadge role={user.role} /></TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{user.schoolName ?? '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.active ? <Badge variant="outline">{t('Actif')}</Badge> : <Badge variant="destructive">{t('Désactivé')}</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('Actions pour {{email}}', { email: user.email })} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setFormState({ open: true, user })}><Pencil /> {t('Modifier')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPasswordUser(user)}><KeyRound /> {t('Mot de passe')}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(user)}><Trash2 /> {t('Supprimer')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6"><EmptyState icon={UserX} title={t('Aucun compte trouvé')}>{t('Modifiez votre recherche ou créez un compte.')}</EmptyState></div>
        )}
      </Card>

      <UserFormDialog open={formState.open} user={formState.user} onOpenChange={(open) => setFormState((s) => ({ ...s, open }))} />
      <ResetPasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('Supprimer ce compte ?')}
        description={t("Le compte {{email}} sera définitivement supprimé. Préférez la désactivation pour conserver l'historique.", { email: deleting?.email ?? '' })}
        onConfirm={() => deleting && deleteUser.mutate(deleting.id, {
          onSuccess: () => toast.success(t('Compte supprimé')),
          onError: (error) => toast.error(error.message),
        })}
      />
    </>
  )
}
