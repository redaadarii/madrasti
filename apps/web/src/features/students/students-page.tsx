import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { ChevronRight, Download, FileUp, GraduationCap, Plus, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { classroomsQueryOptions } from '@madrasti/shared/features/classrooms/queries'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatDate, initials } from '@madrasti/shared/format'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import { studentsApi } from '@madrasti/shared/features/students/api'
import { studentsQueryOptions } from '@madrasti/shared/features/students/queries'
import { ImportStudentsDialog } from './import-dialog'
import { StudentFormDialog } from './student-form-dialog'
import { t } from '@/i18n'

export function StudentsPage() {
  const user = useCurrentUser()
  const initialClassroom = useSearch({ from: '/app/students' }).classroomId
  const [search, setSearch] = useState('')
  const [classroomId, setClassroomId] = useState<number | undefined>(initialClassroom)
  const [page, setPage] = useState(0)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const q = useDeferredValue(search)

  const { data: classrooms = [] } = useQuery(classroomsQueryOptions)
  const { data, isPending } = useQuery(studentsQueryOptions({ q, classroomId, page }))

  const exportStudents = async () => {
    const all = await studentsApi.search({ q, classroomId, page: 0, size: 2000 })
    downloadCsv(`madrasti-eleves-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(all.content, [
      { header: t('Matricule'), value: (s) => s.registrationNumber },
      { header: t('Nom'), value: (s) => s.lastName },
      { header: t('Prénom'), value: (s) => s.firstName },
      { header: t('Naissance'), value: (s) => s.birthDate },
      { header: t('Classe'), value: (s) => s.classroomName },
      { header: t('École'), value: (s) => s.schoolName },
      { header: t('Parent'), value: (s) => s.parentName },
      { header: t('Compte élève'), value: (s) => s.accountEmail },
    ]))
  }

  return (
    <>
      <PageHeader title={t('Élèves')} description={t('Inscriptions, fiches et suivi pédagogique.')}
        actions={
          <>
            <Button variant="outline" onClick={exportStudents}><Download /> {t('Exporter (CSV)')}</Button>
            {MANAGER_ROLES.includes(user.role) && <Button variant="outline" onClick={() => setImporting(true)}><FileUp /> {t('Importer (CSV)')}</Button>}
            {MANAGER_ROLES.includes(user.role) && <Button onClick={() => setCreating(true)}><Plus /> {t('Inscrire un élève')}</Button>}
          </>
        } />

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t('Nom ou matricule…')} aria-label={t('Rechercher un élève')} className="ps-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
          </div>
          <NativeSelect aria-label={t('Filtrer par classe')} value={classroomId ?? ''}
            onChange={(e) => { setClassroomId(e.target.value ? Number(e.target.value) : undefined); setPage(0) }}>
            <NativeSelectOption value="">{t('Toutes les classes')}</NativeSelectOption>
            {classrooms.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
          </NativeSelect>
        </div>

        {isPending ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data && data.content.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{t('Élève')}</TableHead>
                  <TableHead>{t('Classe')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Naissance')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Parent')}</TableHead>
                  <TableHead className="w-10"><span className="sr-only">{t('Ouvrir')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.content.map((student) => (
                  <TableRow key={student.id} className="group">
                    <TableCell className="ps-4">
                      <Link to="/students/$studentId" params={{ studentId: student.id }} className="flex items-center gap-3">
                        <Avatar><AvatarFallback className="bg-secondary text-primary">{initials(student.firstName, student.lastName)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium group-hover:underline">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-muted-foreground">{student.registrationNumber}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{student.classroomName}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{student.birthDate ? formatDate(student.birthDate) : '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{student.parentName ?? '—'}</TableCell>
                    <TableCell><ChevronRight className="rtl:-scale-x-100 size-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} onPageChange={setPage} />
          </>
        ) : (
          <div className="p-6"><EmptyState icon={GraduationCap} title={t('Aucun élève trouvé')} /></div>
        )}
      </Card>
      <StudentFormDialog open={creating} onOpenChange={setCreating} />
      <ImportStudentsDialog open={importing} onOpenChange={setImporting} />
    </>
  )
}
