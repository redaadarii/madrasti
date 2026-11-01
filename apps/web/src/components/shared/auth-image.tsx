import type { ComponentProps } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFileUrl } from '@/lib/files'
import { cn } from '@/lib/utils'

/** Image servie par l'API (authentifiée), avec un squelette pendant le chargement. */
export function AuthImage({ fileId, className, alt, ...props }: { fileId: string } & ComponentProps<'img'>) {
  const url = useFileUrl(fileId)
  if (!url) return <Skeleton className={cn('rounded-none', className)} />
  return <img src={url} alt={alt} className={className} {...props} />
}
