import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('produit un CSV compatible Excel FR avec échappement', () => {
    const csv = toCsv([{ name: 'Adam; "le grand"', amount: 2500 }, { name: 'Lina', amount: null }], [
      { header: 'Élève', value: (r) => r.name },
      { header: 'Montant', value: (r) => r.amount },
    ])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.slice(1).split('\r\n')).toEqual(['Élève;Montant', '"Adam; ""le grand""";2500', 'Lina;'])
  })
})
