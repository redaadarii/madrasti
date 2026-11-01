import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { myChildrenQueryOptions, myProfileQueryOptions } from '@madrasti/shared/features/students/queries'
import { t } from '@/i18n'

/**
 * Élève concerné par une page « familles » : l'élève connecté lui-même, ou l'enfant choisi par le parent.
 * Renvoie {@code undefined} pour le personnel.
 */
export function useFamilyStudent() {
  const user = useCurrentUser()
  const { data: children = [] } = useQuery({ ...myChildrenQueryOptions, enabled: user.role === 'PARENT' })
  const { data: me } = useQuery({ ...myProfileQueryOptions, enabled: user.role === 'STUDENT' })
  const [selected, setSelected] = useState<number>()

  const options = user.role === 'PARENT' ? children : me ? [me] : []
  const student = options.find((s) => s.id === selected) ?? options[0]

  const picker = user.role === 'PARENT' && children.length > 1 && (
    <NativeSelect aria-label={t('Choisir l\'enfant')} value={student?.id ?? ''} onChange={(e) => setSelected(Number(e.target.value))}>
      {children.map((child) => (
        <NativeSelectOption key={child.id} value={child.id}>{child.firstName} · {child.classroomName}</NativeSelectOption>
      ))}
    </NativeSelect>
  )
  return { student, picker: picker || null, isFamily: user.role === 'PARENT' || user.role === 'STUDENT' }
}
