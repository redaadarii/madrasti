import type { HomeworkStatus } from '@madrasti/shared/features/homework/status'
import type { Tone } from '@/components/ui'

export const HOMEWORK_TONES: Record<HomeworkStatus, Tone> = { TODO: 'sun', LATE: 'danger', SUBMITTED: 'primary', REVIEWED: 'mint' }
