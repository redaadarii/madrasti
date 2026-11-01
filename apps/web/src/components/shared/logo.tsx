import { cn } from '@/lib/utils'

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-heading text-xl font-semibold', className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="10" className="fill-primary" />
        <path d="M7.5 22.5V10.5l6.5 7.75 6.5-7.75v12"
          fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
        <circle cx="24.6" cy="8" r="2.8" className="fill-coral" />
      </svg>
      <span className={inverted ? 'text-sidebar-foreground' : 'text-foreground'}>
        Madrasti
      </span>
    </span>
  )
}
