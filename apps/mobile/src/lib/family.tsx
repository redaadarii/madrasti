import { useQuery } from '@tanstack/react-query'
import type { Student } from '@madrasti/shared/features/students/api'
import { myChildrenQueryOptions, myProfileQueryOptions } from '@madrasti/shared/features/students/queries'
import { createContext, type ReactNode, use, useMemo, useState } from 'react'
import { useUser } from './auth'

interface Family {
  /** Élève affiché : l'élève connecté, ou l'enfant choisi par le parent. */
  student: Student | undefined
  children: Student[]
  select: (id: number) => void
}

const FamilyContext = createContext<Family | null>(null)

/** Comme useFamilyStudent sur le web, mais partagé par tous les écrans (le choix de l'enfant est mémorisé). */
export function FamilyProvider({ children: content }: { children: ReactNode }) {
  const user = useUser()
  const isParent = user.role === 'PARENT'
  const { data: children = [] } = useQuery({ ...myChildrenQueryOptions, enabled: isParent })
  const { data: me } = useQuery({ ...myProfileQueryOptions, enabled: user.role === 'STUDENT' })
  const [selected, setSelected] = useState<number>()

  const value = useMemo<Family>(() => {
    const options = isParent ? children : me ? [me] : []
    return { student: options.find((s) => s.id === selected) ?? options[0], children: options, select: setSelected }
  }, [isParent, children, me, selected])

  return <FamilyContext value={value}>{content}</FamilyContext>
}

export function useFamily() {
  const family = use(FamilyContext)
  if (!family) throw new Error('useFamily hors de FamilyProvider')
  return family
}
