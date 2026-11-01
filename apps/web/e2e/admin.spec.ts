import { expect, test } from '@playwright/test'
import { apiToken, login } from './helpers.ts'

let createdEmail: string | undefined

/** Le compte créé par le test est supprimé ensuite, pour ne pas encombrer la base de démonstration. */
test.afterEach(async ({ request }) => {
  if (!createdEmail) return
  const headers = { Authorization: `Bearer ${await apiToken(request, 'admin@madrasti.ma')}` }
  const found = await (await request.get('/api/admin/users', { headers, params: { q: createdEmail } })).json()
  for (const user of found.content) await request.delete(`/api/admin/users/${user.id}`, { headers })
  createdEmail = undefined
})

test("l'administrateur crée un compte enseignant", async ({ page }) => {
  const email = (createdEmail = `e2e.${Date.now()}@madrasti.ma`)
  await login(page, 'admin@madrasti.ma')
  await page.getByRole('link', { name: 'Comptes' }).click()
  await page.getByRole('button', { name: 'Nouveau compte' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Prénom').fill('Ines')
  await dialog.getByLabel('Nom', { exact: true }).fill('Bennis')
  await dialog.getByLabel('Email').fill(email)
  await dialog.getByLabel('Rôle').selectOption('TEACHER')
  await dialog.getByLabel('Mot de passe initial').fill('MotDePasse1')
  await dialog.getByRole('button', { name: 'Créer le compte' }).click()

  await expect(page.getByText('Compte créé')).toBeVisible()
  await page.getByLabel('Rechercher un compte').fill(email)
  await expect(page.getByText(email, { exact: true })).toBeVisible()
})

test('un parent ne peut pas ouvrir la gestion des comptes', async ({ page }) => {
  await login(page, 'parent.adari@madrasti.ma')
  await expect(page.getByRole('link', { name: 'Comptes' })).toHaveCount(0)
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/dashboard/)
})
