import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import i18n from '@/i18n'

// Les tests interrogent l'interface en français (jsdom annonce « en-US » par défaut).
await i18n.changeLanguage('fr')

// API navigateur absentes de jsdom mais utilisées par sonner et le routeur.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
window.scrollTo = vi.fn() as typeof window.scrollTo

afterEach(() => {
  cleanup()
  localStorage.clear()
})
