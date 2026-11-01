// Capture les écrans du web pour le README (stack de dev lancée, données de démonstration).
// Usage : node docs/screenshots/capture.mjs   (BASE_URL pour une autre adresse)
import { chromium } from 'playwright'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const OUT = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE_URL ?? 'http://localhost:5173', PWD = 'Madrasti2026!'
const browser = await chromium.launch()
async function session(email, lang = 'fr') {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: 'light' })
  await ctx.addInitScript((l) => { localStorage.setItem('madrasti.lang', l); localStorage.setItem('madrasti.theme', 'light') }, lang)
  const page = await ctx.newPage()
  if (email) {
    await page.goto(BASE + '/login')
    await page.locator('input[type=email], input[name=email]').first().fill(email)
    await page.locator('input[type=password]').first().fill(PWD)
    await page.locator('form button[type=submit]').first().click()
    await page.waitForURL(/dashboard/)
  }
  return { ctx, page }
}
async function shot(page, path, name, { full = false } = {}) {
  await page.goto(BASE + path)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: '.tsqd-parent-container, .tsqd-open-btn-container, [class*=tsqd] { display: none !important; }' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log('ok', name)
}
const api = await (await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'direction@madrasti.ma', password: PWD, client: 'mobile' }) })).json()
const adam = (await (await fetch(BASE + '/api/students?q=Adam%20Adari', { headers: { Authorization: 'Bearer ' + api.accessToken } })).json()).content[0].id

let s = await session(null); await shot(s.page, '/', '01-accueil'); await shot(s.page, '/login', '02-connexion'); await s.ctx.close()
s = await session(null, 'ar'); await shot(s.page, '/', '03-accueil-arabe'); await s.ctx.close()
s = await session('parent.adari@madrasti.ma'); await shot(s.page, '/dashboard', '10-parent-tableau-de-bord'); await shot(s.page, `/students/${adam}/report-card`, '11-parent-bulletin'); await shot(s.page, '/timetable', '12-parent-emploi-du-temps'); await shot(s.page, '/messages', '13-parent-messagerie'); await s.ctx.close()
s = await session('prof.math@madrasti.ma'); await shot(s.page, '/dashboard', '20-enseignant-tableau-de-bord'); await shot(s.page, '/attendance', '21-enseignant-absences'); await shot(s.page, '/homework', '22-enseignant-devoirs'); await shot(s.page, '/competencies', '23-enseignant-competences'); await s.ctx.close()
s = await session('direction@madrasti.ma'); await shot(s.page, '/dashboard', '30-direction-tableau-de-bord'); await shot(s.page, '/stats', '31-direction-statistiques'); await shot(s.page, `/students/${adam}`, '32-direction-fiche-eleve'); await shot(s.page, '/council', '33-direction-conseil-de-classe'); await s.ctx.close()
s = await session('admin@madrasti.ma'); await shot(s.page, '/payments', '40-admin-finance'); await shot(s.page, '/admin/users', '41-admin-comptes'); await shot(s.page, '/admin/audit', '42-admin-audit'); await s.ctx.close()
s = await session('adam.adari@eleve.madrasti.ma'); await shot(s.page, '/dashboard', '50-eleve-tableau-de-bord'); await shot(s.page, '/quizzes', '51-eleve-quiz'); await s.ctx.close()
s = await session('parent.adari@madrasti.ma', 'ar'); await shot(s.page, '/dashboard', '14-parent-arabe-rtl'); await s.ctx.close()
await browser.close()
