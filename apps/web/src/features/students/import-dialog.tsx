import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FileDown, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { t } from '@/i18n'
import { ApiError, apiBlob, apiForm } from '@/lib/api-client'
import { saveBlob } from '@/lib/files'
import { studentKeys } from '@madrasti/shared/features/students/queries'

export interface ImportReport {
  dryRun: boolean
  rows: number
  studentsCreated: number
  parentsCreated: number
  parentsLinked: number
  errors: { line: number; message: string }[]
}

const importStudents = (file: File, dryRun: boolean) => {
  const form = new FormData()
  form.set('file', file)
  return apiForm<ImportReport>(`/students/import?dryRun=${dryRun}`, form)
}

/**
 * Import de rentrée : on vérifie d'abord le fichier (simulation), puis on importe.
 * L'API applique le tout-ou-rien : une seule ligne en erreur et rien n'est enregistré.
 */
export function ImportStudentsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <ImportForm onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function ImportForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File>()
  const [report, setReport] = useState<ImportReport>()
  const [pending, setPending] = useState(false)

  const run = async (dryRun: boolean) => {
    if (!file) return
    setPending(true)
    try {
      const result = await importStudents(file, dryRun)
      setReport(result)
      if (!dryRun && result.errors.length === 0) {
        await queryClient.invalidateQueries({ queryKey: studentKeys.all })
        toast.success(t('{{count}} élèves importés', { count: result.studentsCreated }))
        onClose()
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('Une erreur est survenue'))
    } finally {
      setPending(false)
    }
  }

  const downloadTemplate = async () => saveBlob(await apiBlob('/students/import/template'), 'modele-import-eleves.csv')
  const checked = report?.dryRun && report.errors.length === 0

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>{t('Importer des élèves')}</DialogTitle>
        <DialogDescription>
          {t('Un fichier CSV (séparateur « ; » ou « , ») avec au minimum les colonnes matricule, prenom, nom et classe. Les comptes parents manquants sont créés à partir de email_parent.')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={downloadTemplate}><FileDown /> {t('Télécharger le modèle')}</Button>
        <Field>
          <FieldLabel htmlFor="import-file">{t('Fichier CSV')}</FieldLabel>
          <Input id="import-file" type="file" accept=".csv,text/csv"
            onChange={(e) => { setFile(e.target.files?.[0]); setReport(undefined) }} />
          <FieldDescription>{t('Mot de passe des nouveaux parents : à définir depuis « Comptes » (réinitialisation).')}</FieldDescription>
        </Field>

        {report && report.errors.length > 0 && (
          <div role="alert" className="max-h-56 overflow-y-auto rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="mb-2 flex items-center gap-2 font-medium text-destructive">
              <AlertTriangle className="size-4" /> {t('{{count}} erreurs : aucun élève n\'a été enregistré', { count: report.errors.length })}
            </p>
            <ul className="space-y-1">
              {report.errors.map((e, i) => (
                <li key={i}><span className="font-semibold tabular-nums">{t('Ligne {{line}}', { line: e.line })}</span> · {e.message}</li>
              ))}
            </ul>
          </div>
        )}
        {checked && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-mint/20 p-3 text-sm">
            <CheckCircle2 className="size-4 text-mint-foreground dark:text-mint" />
            {t('Fichier valide — élèves : {{students}} · parents à créer : {{created}} · parents existants : {{linked}}',
              { students: report.studentsCreated, created: report.parentsCreated, linked: report.parentsLinked })}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t('Annuler')}</Button>
        {checked
          ? <Button onClick={() => run(false)} disabled={pending}><Upload /> {t('Importer')}</Button>
          : <Button onClick={() => run(true)} disabled={!file || pending}>{t('Vérifier le fichier')}</Button>}
      </DialogFooter>
    </DialogContent>
  )
}
