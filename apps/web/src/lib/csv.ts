export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

/** CSV au format Excel français : séparateur « ; », champs échappés, BOM UTF-8 pour les accents. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value)
    return /[;"\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const lines = [columns.map((c) => escape(c.header)), ...rows.map((row) => columns.map((c) => escape(c.value(row))))]
  return '﻿' + lines.map((line) => line.join(';')).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}
