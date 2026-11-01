import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/utils'
import { api, ApiError, UNAUTHORIZED_EVENT } from './api-client'

describe('api client', () => {
  afterEach(() => vi.restoreAllMocks())

  it("n'expose aucun jeton, envoie l'en-tête applicatif et ignore les paramètres vides", async () => {
    const fetchMock = mockApi(() => ({ body: [] }))

    await api('/students', { query: { q: '', classroomId: 3, page: 0 } })

    const [url, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Record<string, string> | undefined
    expect(url).toBe('/api/students?classroomId=3&page=0')
    expect(headers?.Authorization).toBeUndefined()
    expect(headers?.['X-Madrasti-Client']).toBe('web')
  })

  it('transforme un ProblemDetail en ApiError avec les erreurs de champs', async () => {
    mockApi(() => ({ status: 400, body: { detail: 'Données invalides', errors: { email: 'invalide' } } }))

    const error = await api('/admin/users', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'Données invalides', fieldErrors: { email: 'invalide' } })
  })

  it('accepte une création sans corps de réponse (201 vide)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))
    await expect(api('/public/pre-registrations', { method: 'POST', body: {} })).resolves.toBeUndefined()
  })

  it('signale une session expirée sur un 401', async () => {
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)
    mockApi(() => ({ status: 401, body: { detail: 'Unauthorized' } }))

    await expect(api('/auth/me')).rejects.toBeInstanceOf(ApiError)

    expect(listener).toHaveBeenCalledOnce()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })
})
