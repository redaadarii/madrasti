import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, renderRoute } from '@/test/utils'
import { LoginPage } from './login-page'

describe('LoginPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('connecte l’utilisateur, garde son identité en cache et redirige', async () => {
    mockApi(() => ({ body: { accessToken: 'jwt-ok', expiresAt: '2026-12-01T00:00:00Z', user: { id: 1, role: 'ADMIN' } } }))
    const user = userEvent.setup()
    const { router, queryClient } = await renderRoute('/login', LoginPage)

    await user.type(await screen.findByLabelText('Email'), 'admin@madrasti.ma')
    await user.type(screen.getByLabelText('Mot de passe'), 'Madrasti2026!')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument()
    expect(queryClient.getQueryData(['auth', 'me'])).toMatchObject({ id: 1, role: 'ADMIN' })
    expect(Object.keys(localStorage).filter((k) => k.includes('token'))).toEqual([])
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it("affiche l'erreur renvoyée par l'API", async () => {
    mockApi(() => ({ status: 401, body: { detail: 'Email ou mot de passe incorrect' } }))
    const user = userEvent.setup()
    await renderRoute('/login', LoginPage)

    await user.type(await screen.findByLabelText('Email'), 'admin@madrasti.ma')
    await user.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await user.click(screen.getByRole('button', { name: /se connecter/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect')
  })
})
