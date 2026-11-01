import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/i18n'

interface PaginationProps {
  page: number
  totalPages: number
  totalElements: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalElements, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>{t('{{count}} résultats', { count: totalElements })}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label={t('Page précédente')} disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="rtl:-scale-x-100" />
        </Button>
        <span className="tabular-nums">
          {totalPages === 0 ? 0 : page + 1} / {totalPages}
        </span>
        <Button variant="outline" size="icon-sm" aria-label={t('Page suivante')} disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="rtl:-scale-x-100" />
        </Button>
      </div>
    </div>
  )
}
