// Applique thème et langue avant le premier rendu (évite un flash). Fichier séparé : compatible CSP sans 'unsafe-inline'.
try {
  const t = localStorage.getItem('madrasti.theme')
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark')
  const l = localStorage.getItem('madrasti.lang')
  if (l) { document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr' }
} catch {}
