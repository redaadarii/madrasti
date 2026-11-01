import { expect, test } from '@playwright/test'
import { apiToken, login } from './helpers.ts'

test('un parent règle une échéance en ligne (prestataire simulé)', async ({ page, request }) => {
  // Préparation : la direction crée une échéance pour Adam.
  const token = await apiToken(request, 'direction@madrasti.ma')
  const headers = { Authorization: `Bearer ${token}` }
  const students = await (await request.get('/api/students?q=Adam%20Adari', { headers })).json()
  const adam = students.content[0].id as number
  const label = `Sortie E2E ${Date.now()}`
  const due = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10)
  const created = await request.post('/api/payments', { headers, data: { studentId: adam, label, amount: 75, dueDate: due } })
  expect(created.ok()).toBeTruthy()

  await login(page, 'parent.adari@madrasti.ma')
  await page.goto(`/students/${adam}`)
  await page.getByRole('tab', { name: 'Paiements' }).click()
  await page.locator('li', { hasText: label }).getByRole('button', { name: 'Payer en ligne' }).click()

  await expect(page).toHaveURL(/\/pay\/simulated\?session=sim_/)
  await expect(page.getByText(label)).toBeVisible()
  await page.getByRole('button', { name: /Payer/ }).click()

  await expect(page).toHaveURL(/\/payments\/return/)
  await expect(page.getByRole('heading', { name: 'Paiement confirmé' })).toBeVisible()
  await page.getByRole('button', { name: 'Retour à la fiche de l\'élève' }).click()
  await page.getByRole('tab', { name: 'Paiements' }).click()
  await expect(page.locator('li', { hasText: label })).toContainText('En ligne')
})
