import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Leaf, Pencil, Plus, Trash2, TriangleAlert, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { t } from '@/i18n'
import { ApiError } from '@/lib/api-client'
import { dateFormat } from '@madrasti/shared/format'
import { MANAGER_ROLES } from '@madrasti/shared/types'
import { cn } from '@/lib/utils'
import { addDays, type Menu, type MenuInput, useDeleteMenu, useSaveMenu, weekQueryOptions } from '@madrasti/shared/features/canteen/api'

const todayIso = () => new Date().toLocaleDateString('en-CA')
const label = (iso: string, options: Intl.DateTimeFormatOptions) => {
  const text = dateFormat(options).format(new Date(`${iso}T12:00:00`))
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

export function CanteenPage() {
  const user = useCurrentUser()
  const canEdit = MANAGER_ROLES.includes(user.role)
  const [today] = useState(todayIso)
  const [anchor, setAnchor] = useState(today)
  const { data: week } = useQuery(weekQueryOptions(anchor))
  const [editing, setEditing] = useState<{ date: string; menu?: Menu }>()
  const remove = useDeleteMenu()

  const days = week ? Array.from({ length: 5 }, (_, i) => addDays(week.monday, i)) : []
  const menuOf = (date: string) => week?.menus.find((m) => m.date === date)

  return (
    <>
      <PageHeader title={t('Cantine')} description={t('Les menus de la semaine, avec une option végétarienne et les allergènes.')}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label={t('Semaine précédente')} onClick={() => setAnchor(addDays(week?.monday ?? anchor, -7))}>
              <ChevronLeft className="rtl:-scale-x-100" />
            </Button>
            <Button variant="outline" onClick={() => setAnchor(today)}>{t('Cette semaine')}</Button>
            <Button variant="outline" size="icon" aria-label={t('Semaine suivante')} onClick={() => setAnchor(addDays(week?.monday ?? anchor, 7))}>
              <ChevronRight className="rtl:-scale-x-100" />
            </Button>
          </div>
        } />
      {week && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t('Semaine du {{date}}', { date: label(week.monday, { day: 'numeric', month: 'long', year: 'numeric' }) })}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {days.map((date) => {
          const menu = menuOf(date)
          return (
            <Card key={date} className={cn('gap-3', date === today && 'border-primary ring-1 ring-primary/30')}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">{label(date, { weekday: 'long', day: 'numeric', month: 'short' })}</CardTitle>
                {canEdit && (
                  <div className="-mt-1 flex">
                    <Button variant="ghost" size="icon-sm" aria-label={menu ? t('Modifier le menu') : t('Ajouter le menu')}
                      onClick={() => setEditing({ date, menu })}>
                      {menu ? <Pencil /> : <Plus />}
                    </Button>
                    {menu && (
                      <Button variant="ghost" size="icon-sm" aria-label={t('Supprimer le menu')}
                        onClick={() => remove.mutate(date, { onSuccess: () => toast.success(t('Menu supprimé')) })}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {menu ? (
                  <>
                    {menu.starter && <Course label={t('Entrée')} value={menu.starter} />}
                    <Course label={t('Plat')} value={menu.mainCourse} strong />
                    {menu.side && <Course label={t('Accompagnement')} value={menu.side} />}
                    {menu.dessert && <Course label={t('Dessert')} value={menu.dessert} />}
                    {menu.vegetarian && (
                      <p className="flex items-start gap-1.5 rounded-lg bg-mint/15 px-2 py-1.5">
                        <Leaf className="mt-0.5 size-3.5 shrink-0 text-mint-foreground dark:text-mint" />
                        <span>{menu.vegetarian}</span>
                      </p>
                    )}
                    {menu.allergens && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t('Allergènes : {{list}}', { list: menu.allergens })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-muted-foreground"><UtensilsCrossed className="size-4" /> {t('Menu non publié')}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(undefined)}>
        {editing && <MenuForm key={editing.date} date={editing.date} menu={editing.menu} onClose={() => setEditing(undefined)} />}
      </Dialog>
    </>
  )
}

function Course({ label: name, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{name}</p>
      <p className={cn(strong && 'font-semibold')}>{value}</p>
    </div>
  )
}

const FIELDS: { key: keyof MenuInput; label: string }[] = [
  { key: 'starter', label: 'Entrée' },
  { key: 'mainCourse', label: 'Plat' },
  { key: 'side', label: 'Accompagnement' },
  { key: 'dessert', label: 'Dessert' },
  { key: 'vegetarian', label: 'Option végétarienne' },
  { key: 'allergens', label: 'Allergènes' },
]

function MenuForm({ date, menu, onClose }: { date: string; menu?: Menu; onClose: () => void }) {
  const [form, setForm] = useState<MenuInput>({
    starter: menu?.starter ?? '', mainCourse: menu?.mainCourse ?? '', side: menu?.side ?? '',
    dessert: menu?.dessert ?? '', vegetarian: menu?.vegetarian ?? '', allergens: menu?.allergens ?? '',
  })
  const save = useSaveMenu()
  const submit = () =>
    save.mutate({ date, input: form }, {
      onSuccess: () => { toast.success(t('Menu enregistré')); onClose() },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue')),
    })

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{label(date, { weekday: 'long', day: 'numeric', month: 'long' })}</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label: name }) => (
          <Field key={key} className={key === 'allergens' ? 'sm:col-span-2' : undefined}>
            <FieldLabel htmlFor={`menu-${key}`}>{t(name)}{key === 'mainCourse' && ' *'}</FieldLabel>
            <Input id={`menu-${key}`} value={form[key] ?? ''} maxLength={key === 'allergens' ? 200 : 150}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        <Button onClick={submit} disabled={!form.mainCourse.trim() || save.isPending}>{t('Enregistrer')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
