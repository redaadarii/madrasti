import { I18nManager, useColorScheme } from 'react-native'

/** Palette Madrasti (mêmes teintes que le web : bleu marine, jaune crayon, vert réussite). */
const light = {
  background: '#f6f8fc',
  card: '#ffffff',
  text: '#0f1b3d',
  muted: '#5b6785',
  border: '#e2e8f3',
  primary: '#1e3a8a',
  primaryText: '#ffffff',
  primarySoft: '#e6ecfa',
  coral: '#c98a00',
  coralSoft: '#fff4cc',
  accent: '#f5b700',
  mint: '#15803d',
  mintSoft: '#e3f6ea',
  sun: '#8a6400',
  sunSoft: '#fdf3d7',
  danger: '#c2334d',
  dangerSoft: '#fbe8ec',
}

const dark: typeof light = {
  background: '#0b1220',
  card: '#131c31',
  text: '#eef2fb',
  muted: '#9aa6c4',
  border: '#22304d',
  primary: '#8fb0f5',
  primaryText: '#0b1220',
  primarySoft: '#1c2b52',
  coral: '#f5c542',
  coralSoft: '#3a3018',
  accent: '#f5c542',
  mint: '#4ade80',
  mintSoft: '#13321f',
  sun: '#f4c95d',
  sunSoft: '#3a3118',
  danger: '#f08a9b',
  dangerSoft: '#3d1d25',
}

export type Palette = typeof light

export const useTheme = () => (useColorScheme() === 'dark' ? dark : light)

/** iOS laisse le texte saisi aligné à gauche même en RTL : les champs de texte libre suivent le sens de lecture. */
export const inputAlign = { textAlign: I18nManager.isRTL ? 'right' : 'left' } as const
