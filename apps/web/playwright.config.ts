import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de bout en bout. Par défaut contre le serveur de dev (npm run dev + backend) ;
 * en CI contre la stack Docker de production (E2E_BASE_URL=http://localhost:8081).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // Juste après le démarrage de la stack (CI), les premières requêtes d'une JVM froide peuvent dépasser 5 s.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    // Navigateur installé localement (ex. E2E_CHANNEL=chrome) si Chromium ne peut pas être téléchargé.
    channel: process.env.E2E_CHANNEL,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
