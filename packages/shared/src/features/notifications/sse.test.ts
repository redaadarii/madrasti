import { describe, expect, it } from 'vitest'
import { parseSse } from './sse'

describe('parseSse', () => {
  it('extrait les événements complets et garde le reste', () => {
    const { events, rest } = parseSse('event:ready\ndata:ok\n\n:ping\n\nevent:notification\ndata:{"id":1}\n\nevent:notif')
    expect(events).toEqual([{ event: 'ready', data: 'ok' }, { event: 'notification', data: '{"id":1}' }])
    expect(rest).toBe('event:notif')
  })

  it('accepte les fins de ligne CRLF et les données sur plusieurs lignes', () => {
    expect(parseSse('data: a\r\ndata: b\r\n\r\n').events).toEqual([{ event: 'message', data: 'a\nb' }])
  })
})
