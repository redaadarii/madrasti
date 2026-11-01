import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { ApiError } from '@madrasti/shared/http'
import LoginScreen from '@/app/login'
import { StaffAccountError } from '@/lib/auth'
import i18n from '@/lib/i18n'

const mockLogin = jest.fn()

jest.mock('@/lib/auth', () => {
  const actual = jest.requireActual('@/lib/auth')
  return { ...actual, useAuth: () => ({ login: mockLogin }) }
})

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email)
  await fireEvent.changeText(screen.getByLabelText('Mot de passe'), password)
  await fireEvent.press(screen.getByRole('button', { name: /Se connecter/ }))
}

describe('LoginScreen', () => {
  // Langue du « téléphone » sous Jest : anglais ; l'écran est vérifié en français.
  beforeAll(() => i18n.changeLanguage('fr'))
  beforeEach(() => mockLogin.mockReset())

  it('connecte avec l’email nettoyé des espaces', async () => {
    mockLogin.mockResolvedValue(undefined)
    await render(<LoginScreen />)
    await fill('  parent.adari@madrasti.ma ', 'Madrasti2026!')
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('parent.adari@madrasti.ma', 'Madrasti2026!'))
  })

  it('oriente le personnel vers l’espace web', async () => {
    mockLogin.mockRejectedValue(new StaffAccountError())
    await render(<LoginScreen />)
    await fill('direction@madrasti.ma', 'Madrasti2026!')
    expect(await screen.findByRole('alert')).toHaveTextContent(/réservée aux familles/)
  })

  it('affiche le message d’erreur traduit renvoyé par l’API', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Email ou mot de passe incorrect'))
    await render(<LoginScreen />)
    await fill('parent.adari@madrasti.ma', 'mauvais')
    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect')
  })
})
