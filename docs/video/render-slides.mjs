// Rend chaque diapositive de slides.json en image 1920×1080 (Chromium de Playwright).
// Usage : node docs/video/render-slides.mjs <dossier de sortie>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const out = resolve(process.argv[2] ?? join(here, 'build'))
const slides = JSON.parse(readFileSync(join(here, 'slides.json'), 'utf8'))
const shots = join(root, 'docs/screenshots')
const fonts = join(root, 'node_modules/@fontsource-variable')

const css = `
@font-face { font-family: Fraunces; src: url(file://${fonts}/fraunces/files/fraunces-latin-wght-normal.woff2); font-weight: 100 900; }
@font-face { font-family: Jakarta; src: url(file://${fonts}/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2); font-weight: 200 800; }
@font-face { font-family: Kufi; src: url(file://${fonts}/noto-kufi-arabic/files/noto-kufi-arabic-arabic-wght-normal.woff2); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; font-family: Jakarta, Kufi, sans-serif; color: #0f1b3d;
  background: radial-gradient(circle at 85% 10%, #fff4cc 0, transparent 35%), #f6f8fc; }
.dark { background: radial-gradient(circle at 80% 20%, #2c4aa6 0, transparent 45%), #13235c; color: #fff; }
h1 { font-family: Fraunces, Kufi, serif; font-weight: 600; letter-spacing: -0.01em; }
.brand { position: absolute; left: 80px; bottom: 56px; display: flex; gap: 14px; align-items: center; font-family: Fraunces; font-size: 30px; font-weight: 600; }
.logo { width: 52px; height: 52px; }
.accent { color: #f5b700; }
.title { display: flex; flex-direction: column; justify-content: center; height: 100%; padding: 0 160px; gap: 34px; }
.title h1 { font-size: 132px; }
.title p { font-size: 52px; opacity: .85; }
.bullets { padding: 150px 160px; }
.bullets h1 { font-size: 88px; margin-bottom: 70px; }
.bullets li { list-style: none; font-size: 50px; margin: 0 0 34px; display: flex; gap: 28px; align-items: center; }
.bullets li::before { content: ''; width: 22px; height: 22px; border-radius: 50%; background: #f5b700; flex: none; }
.shot { padding: 60px 80px; display: flex; flex-direction: column; height: 100%; }
.shot h1 { font-size: 60px; }
.shot p { font-size: 30px; color: #5b6785; margin: 10px 0 34px; }
.frame { flex: 1; display: flex; justify-content: center; align-items: flex-start; }
.frame img { height: 800px; border-radius: 18px; box-shadow: 0 30px 80px rgba(15, 27, 61, .25); border: 1px solid #e2e8f3; }
.phones { flex: 1; display: flex; justify-content: center; gap: 46px; align-items: flex-start; }
.phones img { height: 790px; border-radius: 46px; border: 10px solid #0f1b3d; box-shadow: 0 30px 70px rgba(15, 27, 61, .3); }
.arch { padding: 70px 100px; height: 100%; }
.arch h1 { font-size: 72px; margin-bottom: 56px; }
.row { display: flex; gap: 40px; justify-content: center; margin-bottom: 44px; }
.box { background: #fff; border: 2px solid #c9d5ee; border-radius: 26px; padding: 26px 34px; font-size: 32px; text-align: center; min-width: 380px; box-shadow: 0 12px 30px rgba(15, 27, 61, .08); }
.box b { display: block; font-size: 38px; color: #1e3a8a; margin-bottom: 6px; }
.box.primary { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }
.box.primary b { color: #f5b700; }
.arrow { text-align: center; font-size: 46px; color: #5b6785; margin: -24px 0 20px; }
`
const logo = `<svg class="logo" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="#1e3a8a"/><path d="M7.5 22.5V10.5l6.5 7.75 6.5-7.75v12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24.6" cy="8" r="2.8" fill="#f5b700"/></svg>`
const brand = `<div class="brand">${logo}<span>Madrasti</span></div>`
const img = (name) => `file://${shots}/${name}`

function html(slide) {
  switch (slide.kind) {
    case 'title':
      return `<body class="dark"><div class="title">${logo.replace('class="logo"', 'style="width:150px;height:150px"')}<h1>${slide.title}</h1><p>${slide.subtitle}</p></div></body>`
    case 'bullets':
      return `<body><div class="bullets"><h1>${slide.title}</h1><ul>${slide.bullets.map((b) => `<li>${b}</li>`).join('')}</ul></div>${brand}</body>`
    case 'shot':
      return `<body><div class="shot"><h1>${slide.title}</h1><p>${slide.caption}</p><div class="frame"><img src="${img(slide.image)}"></div></div></body>`
    case 'mobile':
      return `<body><div class="shot"><h1>${slide.title}</h1><p>${slide.caption}</p><div class="phones">${slide.images.map((i) => `<img src="${img(i)}">`).join('')}</div></div></body>`
    case 'architecture':
      return `<body><div class="arch"><h1>${slide.title}</h1>
        <div class="row"><div class="box"><b>Web</b>React 19 · Vite</div><div class="box"><b>Mobile</b>React Native · Expo</div></div>
        <div class="row"><div class="box" style="min-width:820px"><b>@madrasti/shared</b>client API · types · requêtes · traductions</div></div>
        <div class="arrow">↓</div>
        <div class="row"><div class="box primary" style="min-width:820px"><b>API Spring Boot 4 · Java 25</b>JWT · temps réel (SSE) · OpenAPI</div></div>
        <div class="arrow">↓</div>
        <div class="row"><div class="box"><b>PostgreSQL</b>données</div><div class="box"><b>Redis</b>notifications</div><div class="box"><b>Services</b>CMI · Stripe · SMS · Jitsi</div></div>
      </div>${brand}</body>`
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const [i, slide] of slides.entries()) {
  const file = join(out, `slide-${String(i + 1).padStart(2, '0')}.html`)
  writeFileSync(file, `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head>${html(slide)}</html>`)
  await page.goto('file://' + file)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  await page.screenshot({ path: file.replace('.html', '.png') })
  writeFileSync(file.replace('.html', '.txt'), slide.say)
}
await browser.close()
console.log(`${slides.length} diapositives dans ${out}`)
