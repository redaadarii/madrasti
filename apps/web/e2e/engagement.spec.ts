import { expect, test } from '@playwright/test'
import { login } from './helpers.ts'

test('la direction publie un sondage et un parent y répond', async ({ browser }) => {
  const question = `Kermesse E2E ${Date.now()} ?`

  const director = await browser.newPage()
  await login(director, 'direction@madrasti.ma')
  await director.getByRole('link', { name: 'Sondages' }).click()
  await director.getByRole('button', { name: 'Nouveau sondage' }).click()
  const dialog = director.getByRole('dialog')
  await dialog.getByLabel('Question').fill(question)
  await dialog.getByLabel('Destinataires').selectOption('PARENTS')
  await dialog.getByLabel('Réponse 1').fill('Samedi')
  await dialog.getByLabel('Réponse 2').fill('Dimanche')
  await dialog.getByRole('button', { name: 'Publier' }).click()
  await expect(director.getByText('Sondage publié')).toBeVisible()

  const parent = await browser.newPage()
  await login(parent, 'parent.berrada@madrasti.ma')
  await parent.goto('/polls')
  const card = parent.locator('[data-slot="card"]', { hasText: question })
  await expect(card.getByText('Résultats visibles après votre réponse')).toBeVisible()
  await card.getByRole('button', { name: 'Dimanche' }).click()
  await expect(card.getByText('100% · 1')).toBeVisible()
})

test('un enseignant ouvre des créneaux de rendez-vous et un parent en réserve un', async ({ browser }) => {
  const teacher = await browser.newPage()
  await login(teacher, 'prof.sciences@madrasti.ma')
  await teacher.goto('/appointments')
  await teacher.getByRole('button', { name: 'Ouvrir des créneaux' }).click()
  const dialog = teacher.getByRole('dialog')
  // Jour unique par exécution : les créneaux d'un passage précédent ne se chevauchent pas.
  const date = new Date(Date.now() + (30 + Math.floor(Math.random() * 300)) * 86_400_000).toISOString().slice(0, 10)
  await dialog.getByLabel('Date').fill(date)
  await dialog.getByLabel('Début').fill('08:00')
  await dialog.getByLabel('Nombre de créneaux').fill('2')
  await dialog.getByRole('button', { name: 'Publier' }).click()
  await expect(teacher.getByText('2 créneaux ouverts')).toBeVisible()

  const parent = await browser.newPage()
  await login(parent, 'parent.adari@madrasti.ma')
  await parent.goto('/appointments')
  await parent.getByRole('tab', { name: /Chraibi/ }).click()
  await parent.getByRole('button', { name: '08:00' }).first().click()
  await parent.getByRole('dialog').getByRole('button', { name: 'Confirmer' }).click()
  await expect(parent.getByText('Rendez-vous confirmé')).toBeVisible()
})
