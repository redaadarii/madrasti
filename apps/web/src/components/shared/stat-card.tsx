import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const tones = {
  primary: 'bg-secondary text-primary',
  coral: 'bg-coral/15 text-coral',
  mint: 'bg-mint/25 text-mint-foreground',
  sun: 'bg-sun/30 text-sun-foreground',
} as const

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: keyof typeof tones
  hint?: string
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', hint }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('grid size-11 place-items-center rounded-2xl', tones[tone])}>
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  )
}
