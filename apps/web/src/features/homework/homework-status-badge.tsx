import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { HOMEWORK_STATUS_LABELS, type HomeworkStatus } from '@madrasti/shared/features/homework/status'
import { t } from '@/i18n'

const tones: Record<HomeworkStatus, string> = {
  TODO: 'bg-sun/40 text-sun-foreground',
  LATE: 'bg-destructive/10 text-destructive',
  SUBMITTED: 'bg-secondary text-secondary-foreground',
  REVIEWED: 'bg-mint/30 text-mint-foreground',
}

export const HomeworkStatusBadge = ({ status }: { status: HomeworkStatus }) => (
  <Badge className={cn('border-0', tones[status])}>{t(HOMEWORK_STATUS_LABELS[status])}</Badge>
)
