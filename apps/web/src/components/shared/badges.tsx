import { Badge } from '@/components/ui/badge'
import type { PaymentStatus } from '@madrasti/shared/features/payments/api'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, type Role } from '@madrasti/shared/types'
import { t } from '@/i18n'

const roleTones: Record<Role, string> = {
  ADMIN: 'bg-primary text-primary-foreground',
  DIRECTOR: 'bg-secondary text-secondary-foreground',
  TEACHER: 'bg-mint/30 text-mint-foreground',
  PARENT: 'bg-coral/15 text-coral',
  STUDENT: 'bg-sun/40 text-sun-foreground',
}

export const RoleBadge = ({ role }: { role: Role }) => (
  <Badge className={cn('border-0', roleTones[role])}>{t(ROLE_LABELS[role])}</Badge>
)

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  PAID: { label: 'Payé', className: 'bg-mint/30 text-mint-foreground' },
  PENDING: { label: 'À venir', className: 'bg-sun/40 text-sun-foreground' },
  OVERDUE: { label: 'En retard', className: 'bg-destructive/10 text-destructive' },
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, className } = statusConfig[status]
  return <Badge className={cn('border-0', className)}>{t(label)}</Badge>
}
