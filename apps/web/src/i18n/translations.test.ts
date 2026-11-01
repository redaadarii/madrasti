/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { NAV_SECTIONS } from '@/components/layout/navigation'
import { AUDIENCE_LABELS } from '@madrasti/shared/features/announcements/api'
import { AUDIT_ACTION_LABELS } from '@madrasti/shared/features/audit/api'
import { MASTERY_LEVELS } from '@madrasti/shared/features/competencies/api'
import { MODE_LABELS } from '@madrasti/shared/features/appointments/api'
import { BEHAVIOR_CATEGORIES, SANCTION_LABELS } from '@madrasti/shared/features/behavior/api'
import { EVENT_KIND_LABELS } from '@madrasti/shared/features/calendar/api'
import { CATEGORY_LABELS, STATUS_LABELS } from '@madrasti/shared/features/complaints/api'
import { COUNCIL_DECISION_LABELS } from '@madrasti/shared/features/council/api'
import { RESOURCE_KIND_LABELS } from '@madrasti/shared/features/courses/api'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_STATUS_LABELS } from '@madrasti/shared/features/expenses/api'
import { HOMEWORK_STATUS_LABELS } from '@madrasti/shared/features/homework/status'
import { PAYMENT_METHOD_LABELS } from '@madrasti/shared/features/payments/api'
import { SERVICE_KIND_LABELS } from '@madrasti/shared/features/services/api'
import { SMS_AUDIENCE_LABELS, SMS_STATUS_LABELS } from '@madrasti/shared/features/sms/api'
import { DAYS } from '@madrasti/shared/features/timetable/api'
import { ROLE_LABELS } from '@madrasti/shared/types'
import { globSync, readFileSync } from 'node:fs'
import { translations } from '@madrasti/shared/i18n'

const { fr, en, ar } = translations

/** Un seul dictionnaire pour tout le monorepo : textes du web, des services partagés et de l'application mobile. */
const SOURCE_GLOBS = ['src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.ts', '../mobile/{app,src}/**/*.{ts,tsx}']
const sources = SOURCE_GLOBS.flatMap((pattern) => globSync(pattern))
  .filter((file) => !/\.test\./.test(file) && !file.includes('components/ui/'))
  .map((file) => readFileSync(file, 'utf8'))

const CALL = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1(\s*,\s*\{[^}]*\bcount\b)?/g

function usedKeys() {
  const keys = new Map<string, boolean>()
  for (const code of sources) {
    for (const [, , raw, plural] of code.matchAll(CALL)) keys.set(raw.replace(/\\(['"])/g, '$1'), !!plural)
  }
  return keys
}

const labelKeys = [
  ...Object.values(ROLE_LABELS), ...Object.values(AUDIENCE_LABELS), ...Object.values(EVENT_KIND_LABELS),
  ...Object.values(CATEGORY_LABELS), ...Object.values(STATUS_LABELS), ...Object.values(HOMEWORK_STATUS_LABELS),
  ...Object.values(PAYMENT_METHOD_LABELS), ...Object.values(SERVICE_KIND_LABELS), ...DAYS,
  ...Object.values(SMS_AUDIENCE_LABELS), ...Object.values(SMS_STATUS_LABELS), ...Object.values(EXPENSE_CATEGORY_LABELS),
  ...Object.values(EXPENSE_STATUS_LABELS), ...Object.values(RESOURCE_KIND_LABELS), ...Object.values(COUNCIL_DECISION_LABELS),
  ...Object.values(MODE_LABELS), ...Object.values(SANCTION_LABELS), ...BEHAVIOR_CATEGORIES.map((c) => c.label),
  ...Object.values(AUDIT_ACTION_LABELS), ...MASTERY_LEVELS.map((m) => m.label),
  'Entrée', 'Plat', 'Accompagnement', 'Dessert', 'Option végétarienne', 'Allergènes',
  'Facture reçue', 'Marquer payé', 'Libellé requis', 'Montant requis', 'Code Massar : une lettre et 9 chiffres',
  ...NAV_SECTIONS.flatMap((section) => [section.title, ...section.items.map((item) => item.label)]),
]

const dictionaries = { en, ar } as Record<string, Record<string, string>>

describe('traductions', () => {
  it.each(['en', 'ar'])('couvrent chaque texte de l’interface en %s', (lang) => {
    const dictionary = dictionaries[lang]
    const missing: string[] = []
    for (const [key, plural] of usedKeys()) {
      if (!(plural ? `${key}_other` in dictionary : key in dictionary)) missing.push(key)
    }
    for (const key of labelKeys) if (!(key in dictionary)) missing.push(key)
    expect(missing).toEqual([])
  })

  it('déclinent les pluriels français au singulier', () => {
    expect(fr['{{count}} élèves_one']).toBe('{{count}} élève')
  })

  it("utilisent les six formes plurielles de l'arabe", () => {
    const forms = Object.keys(ar).filter((k) => k.startsWith('{{count}} élèves_'))
    expect(forms.map((k) => k.split('_').pop()).sort()).toEqual(['few', 'many', 'one', 'other', 'two', 'zero'])
  })

  it('conservent les variables {{…}} de la clé française', () => {
    const variables = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join()
    for (const dictionary of Object.values(dictionaries)) {
      for (const [key, value] of Object.entries(dictionary)) {
        if (/_(zero|one|two|few|many|other)$/.test(key)) continue
        expect(variables(value), key).toBe(variables(key))
      }
    }
  })
})
