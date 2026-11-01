import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, configureApi } from './http'

const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status })

describe('renouvellement de session', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renouvelle le jeton une fois puis rejoue la requête', async () => {
    let token = 'expiré'
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const onUnauthorized = vi.fn()
    configureApi({
      baseUrl: 'https://api.test', headers: () => ({ Authorization: `Bearer ${token}` }),
      refresh: async () => { token = 'neuf'; return true }, onUnauthorized,
    })

    await expect(api('/students/me')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer neuf')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('signale la session expirée si le renouvellement échoue, sans boucler', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(401, { detail: 'Session expirée' }))
    vi.stubGlobal('fetch', fetchMock)
    const refresh = vi.fn().mockResolvedValue(false)
    const onUnauthorized = vi.fn()
    configureApi({ baseUrl: 'https://api.test', headers: () => ({}), refresh, onUnauthorized })

    await expect(api('/students/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('ne tente jamais de renouveler sur les routes de connexion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401)))
    const refresh = vi.fn()
    configureApi({ baseUrl: 'https://api.test', headers: () => ({}), refresh })

    await expect(api('/auth/login', { method: 'POST', body: {} })).rejects.toBeInstanceOf(ApiError)
    expect(refresh).not.toHaveBeenCalled()
  })
})
