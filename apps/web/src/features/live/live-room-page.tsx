import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@madrasti/shared/features/auth/queries'
import { liveSessionQueryOptions } from '@madrasti/shared/features/live/queries'
import { t } from '@/i18n'

/** Salle de classe virtuelle : intègre la salle Jitsi avec le nom de l'utilisateur pré-rempli. */
export function LiveRoomPage() {
  const { sessionId } = useParams({ from: '/app/live/$sessionId' })
  const { data: session } = useSuspenseQuery(liveSessionQueryOptions(sessionId))
  const user = useCurrentUser()

  const displayName = encodeURIComponent(JSON.stringify(`${user.firstName} ${user.lastName}`))
  const roomUrl = `${session.meetingUrl}#userInfo.displayName=${displayName}&config.prejoinPageEnabled=false`
  const isPublicJitsi = new URL(session.meetingUrl).hostname === 'meet.jit.si'

  return (
    <div className="flex h-[calc(100svh-9rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label={t('Retour aux classes en direct')} nativeButton={false} render={<Link to="/live" />}>
            <ArrowLeft className="rtl:-scale-x-100" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{session.title}</h1>
            <p className="text-sm text-muted-foreground">{session.subject} · {session.classroomName} · {session.teacherName}</p>
          </div>
        </div>
        <Button variant="outline" nativeButton={false} render={<a href={session.meetingUrl} target="_blank" rel="noreferrer" />}>
          <ExternalLink /> {t('Ouvrir dans un onglet')}
        </Button>
      </div>
      {isPublicJitsi && (
        <p className="flex items-start gap-2 rounded-xl bg-sun/30 px-3 py-2 text-sm text-sun-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          {t("Serveur de démonstration meet.jit.si : l'appel intégré est coupé après 5 minutes. Pour un cours complet, ouvrez-le dans un onglet ou configurez votre propre serveur Jitsi (MADRASTI_JITSI_URL).")}
        </p>
      )}
      <iframe
        title={t('Cours en direct : {{title}}', { title: session.title })}
        src={roomUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
        className="min-h-[420px] w-full flex-1 rounded-2xl border bg-sidebar"
      />
    </div>
  )
}
