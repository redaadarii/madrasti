import { Check, Hourglass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import type { Absence } from '@madrasti/shared/features/attendance/api'

export function AbsenceStatusBadge({ absence }: { absence: Pick<Absence, 'justified' | 'justificationStatus' | 'reason'> }) {
  if (absence.justified) {
    return <Badge className="border-0 bg-mint/30 text-mint-foreground" title={absence.reason ?? undefined}><Check /> {t('Justifiée')}</Badge>
  }
  if (absence.justificationStatus === 'PENDING') {
    return <Badge className="border-0 bg-sun/40 text-sun-foreground"><Hourglass /> {t('Justificatif en attente')}</Badge>
  }
  if (absence.justificationStatus === 'REJECTED') {
    return <Badge variant="destructive">{t('Justificatif refusé')}</Badge>
  }
  return <Badge variant="destructive">{t('Non justifiée')}</Badge>
}
