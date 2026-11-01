import type { AppNotification } from '@madrasti/shared/features/notifications/api'
import { mobileRoute } from '../notification-routes'

const notification = (type: AppNotification['type'], link: string | null): AppNotification =>
  ({ id: 1, type, link, params: {}, read: false, createdAt: '2026-10-31T10:00:00Z' })

describe('mobileRoute', () => {
  it('traduit les liens du web en écrans mobiles', () => {
    expect(mobileRoute(notification('MESSAGE', '/messages'))).toBe('/messages')
    expect(mobileRoute(notification('POLL', '/polls'))).toBe('/polls')
    expect(mobileRoute(notification('BEHAVIOR', '/behavior'))).toBe('/behavior')
  })

  it("se rabat sur le type quand le lien vise une page web (fiche élève)", () => {
    expect(mobileRoute(notification('ABSENCE', '/students/12'))).toBe('/absences')
    expect(mobileRoute(notification('JUSTIFICATION', '/students/12'))).toBe('/absences')
    expect(mobileRoute(notification('GRADE', '/students/12'))).toBe('/results')
  })

  it("n'ouvre rien quand aucun écran ne correspond", () => {
    expect(mobileRoute(notification('ANNOUNCEMENT', '/announcements'))).toBeUndefined()
  })
})
