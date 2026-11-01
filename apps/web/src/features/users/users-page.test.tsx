import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, renderWithQuery } from '@/test/utils'
import type { User } from '@madrasti/shared/features/users/api'
import { UsersPage } from './users-page'

const nadia: User = {
  id: 3, email: 'prof.math@madrasti.ma', firstName: 'Nadia', lastName: 'Alaoui', phone: null, role: 'TEACHER',
  schoolId: 1, schoolName: 'Les Orangers', active: true, createdAt: '2026-10-01T10:00:00Z',
}

const page = (content: User[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 })

describe('UsersPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('liste les comptes et filtre par rôle', async () => {
    const fetchMock = mockApi((url) => ({
      body: url.searchParams.get('role') === 'PARENT' ? page([]) : page([nadia]),
    }))
    renderWithQuery(<UsersPage />)

    expect(await screen.findByText('Nadia Alaoui')).toBeInTheDocument()
    expect(screen.getByText('prof.math@madrasti.ma')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Filtrer par rôle'), 'PARENT')

    expect(await screen.findByText('Aucun compte trouvé')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('role=PARENT'), expect.anything())
  })

  it('crée un compte et affiche les erreurs de validation', async () => {
    const created: unknown[] = []
    mockApi((url, init) => {
      if (url.pathname === '/api/schools') return { body: [{ id: 1, name: 'Les Orangers', city: 'Casablanca' }] }
      if (init.method === 'POST') {
        created.push(JSON.parse(String(init.body)))
        return { status: 201, body: nadia }
      }
      return { body: page([nadia]) }
    })
    const user = userEvent.setup()
    renderWithQuery(<UsersPage />)

    await user.click(await screen.findByRole('button', { name: /nouveau compte/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

    expect(await within(dialog).findByText('Prénom requis')).toBeInTheDocument()
    expect(within(dialog).getByText('8 caractères minimum')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Prénom'), 'Hamza')
    await user.type(within(dialog).getByLabelText('Nom'), 'Kettani')
    await user.type(within(dialog).getByLabelText('Email'), 'hamza@madrasti.ma')
    await user.selectOptions(within(dialog).getByLabelText('Rôle'), 'DIRECTOR')
    await user.type(within(dialog).getByLabelText('Mot de passe initial'), 'MotDePasse1')
    await user.click(within(dialog).getByRole('button', { name: 'Créer le compte' }))

    await waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]).toMatchObject({ firstName: 'Hamza', role: 'DIRECTOR', email: 'hamza@madrasti.ma', password: 'MotDePasse1' })
    expect(await screen.findByText('Compte créé')).toBeInTheDocument()
  })
})
