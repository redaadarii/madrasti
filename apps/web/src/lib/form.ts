import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from './api-client'
import { t } from '@/i18n'

/** Reporte les erreurs de validation du serveur sur les champs du formulaire, sinon affiche un toast. */
export function handleFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      setError(field as Path<T>, { message })
    }
    return
  }
  toast.error(error instanceof Error ? error.message : t('Une erreur est survenue'))
}

/** Convertit '' en undefined et une chaîne numérique en nombre (pour les <select> d'identifiants). */
export const optionalId = (value: unknown) => (value === '' || value == null ? undefined : Number(value))
