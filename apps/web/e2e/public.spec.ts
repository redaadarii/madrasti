import { expect, test } from '@playwright/test'

test('la page publique passe en arabe, de droite à gauche', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Moins d'administratif")
  await page.getByRole('button', { name: 'Changer de langue' }).click()
  await page.getByRole('menuitem', { name: 'العربية' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('إدارة أقل')
})

test("une famille dépose une pré-inscription sans compte", async ({ page }) => {
  await page.goto('/pre-inscription')
  await page.getByLabel('Prénom').fill('Sami')
  await page.getByLabel('Nom', { exact: true }).fill(`E2E-${Date.now()}`)
  await page.getByLabel('Date de naissance').fill('2019-03-14')
  await page.getByLabel('Niveau souhaité').selectOption('CP')
  await page.getByLabel('Nom complet').fill('Parent E2E')
  await page.getByLabel('Email').fill('parent.e2e@example.com')
  await page.getByLabel('Téléphone').fill('+212 600 11 22 33')
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click()
  await expect(page.getByRole('heading', { name: 'Demande envoyée !' })).toBeVisible()
})
