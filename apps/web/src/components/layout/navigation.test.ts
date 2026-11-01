import { describe, expect, it } from 'vitest'
import type { Role } from '@madrasti/shared/types'
import { navigationFor } from './navigation'

const labels = (role: Role) => navigationFor(role).flatMap((section) => section.items.map((item) => item.label))

describe('navigationFor', () => {
  it("réserve l'administration des comptes à l'admin", () => {
    expect(labels('ADMIN')).toContain('Comptes')
    expect(labels('DIRECTOR')).not.toContain('Comptes')
    expect(labels('DIRECTOR')).toContain('Pré-inscriptions')
  })

  it('ne montre aux familles ni la gestion ni la finance globale', () => {
    const parent = labels('PARENT')
    expect(parent).toEqual(expect.arrayContaining(['Emploi du temps', 'Messagerie', 'Transport & activités', 'Bibliothèque']))
    expect(parent).not.toContain('Élèves')
    expect(parent).not.toContain('Finance')
    expect(parent).not.toContain('Devoirs')
  })

  it("donne à l'élève ses outils pédagogiques", () => {
    expect(labels('STUDENT')).toEqual(expect.arrayContaining(['Devoirs', 'Quiz en ligne', 'Classes en direct']))
    expect(labels('STUDENT')).not.toContain('Absences')
  })

  it('masque les sections vides', () => {
    expect(navigationFor('STUDENT').map((s) => s.title)).not.toContain('Administration')
  })
})
