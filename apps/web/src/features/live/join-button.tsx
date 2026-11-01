import { Link } from '@tanstack/react-router'
import { ExternalLink, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LiveSession } from '@madrasti/shared/features/live/api'
import { t } from '@/i18n'

/** Salle Jitsi : ouverte dans Madrasti. Lien externe (Zoom, Meet…) : nouvel onglet. */
export function JoinButton({ session, size = 'default' }: { session: LiveSession; size?: 'default' | 'sm' }) {
  if (session.status !== 'LIVE') {
    return (
      <Button size={size} variant="outline" disabled>
        {session.status === 'ENDED' ? t('Terminé') : t('Ouvre 10 min avant')}
      </Button>
    )
  }
  if (session.provider === 'EXTERNAL') {
    return (
      <Button size={size} nativeButton={false} render={<a href={session.meetingUrl} target="_blank" rel="noreferrer" />}>
        <ExternalLink /> {t('Rejoindre')}
      </Button>
    )
  }
  return (
    <Button size={size} nativeButton={false} render={<Link to="/live/$sessionId" params={{ sessionId: session.id }} />}>
      <Video /> {t('Rejoindre')}
    </Button>
  )
}
