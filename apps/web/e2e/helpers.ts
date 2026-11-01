import { type APIRequestContext, expect, type Page } from '@playwright/test'

export const DEMO_PASSWORD = 'Madrasti2026!'

/** Connexion par l'interface (cookie de session HttpOnly posé par l'API). */
export async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: /se connecter/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

/** Jeton d'API pour préparer des données hors navigateur (en-tête Authorization). */
export async function apiToken(request: APIRequestContext, email: string) {
  const response = await request.post('/api/auth/login', { data: { email, password: DEMO_PASSWORD } })
  expect(response.ok()).toBeTruthy()
  return (await response.json()).accessToken as string
}
