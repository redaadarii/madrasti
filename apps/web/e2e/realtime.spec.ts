import { expect, test } from '@playwright/test'
import { apiToken, login } from './helpers.ts'

test("le parent est prévenu en temps réel d'un retard saisi par l'enseignante", async ({ page, request }) => {
  // Le flux temps réel s'ouvre après la connexion : on l'attend avant de déclencher l'événement.
  const streamOpened = page.waitForResponse((r) => r.url().includes('/api/notifications/stream') && r.ok())
  await login(page, 'parent.adari@madrasti.ma')
  await streamOpened

  const teacher = await apiToken(request, 'prof.math@madrasti.ma')
  const director = await apiToken(request, 'direction@madrasti.ma')
  const students = await (await request.get('/api/students?q=Adam', { headers: { Authorization: `Bearer ${director}` } })).json()
  const today = new Date().toISOString().slice(0, 10)

  const recorded = await request.post('/api/absences', {
    headers: { Authorization: `Bearer ${teacher}` },
    data: { studentId: students.content[0].id, day: today, kind: 'LATE', reason: 'E2E' },
  })
  expect(recorded.status()).toBe(201)

  // Aucun rechargement : la notification arrive par le flux SSE (relayé par Redis entre instances en production).
  await expect(page.getByText(/Retard de Adam le/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('button', { name: /notifications? non lues?/ })).toBeVisible()
})
