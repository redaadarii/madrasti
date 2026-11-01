import * as SecureStore from 'expo-secure-store'
import { refreshSession } from '../api'
import { currentToken } from '../session'

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value) }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key) }),
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
  }
})

describe('refreshSession', () => {
  beforeEach(async () => {
    await SecureStore.setItemAsync('madrasti.refreshToken', 'jeton-1')
  })

  it('ne présente qu’une fois le jeton, même pour plusieurs requêtes simultanées', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: 'acces-2', refreshToken: 'jeton-2' }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()])

    expect(results).toEqual([true, true, true])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ refreshToken: 'jeton-1' })
    expect(currentToken()).toBe('acces-2')
    expect(await SecureStore.getItemAsync('madrasti.refreshToken')).toBe('jeton-2')
  })

  it('efface les jetons quand le serveur refuse le renouvellement', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch
    await expect(refreshSession()).resolves.toBe(false)
    expect(await SecureStore.getItemAsync('madrasti.refreshToken')).toBeNull()
  })
})
