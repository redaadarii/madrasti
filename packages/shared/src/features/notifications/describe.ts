import { categoryInfo, type BehaviorCategory } from '../behavior/api'
import { STATUS_LABELS, type ComplaintStatus } from '../complaints/api'
import { t } from '../../i18n'
import { dateFormat, formatDate } from '../../format'
import type { AppNotification } from './api'

/** Texte d'une notification dans la langue courante, à partir de son type et de ses paramètres. */
export function describeNotification({ type, params }: Pick<AppNotification, 'type' | 'params'>): string {
  switch (type) {
    case 'MESSAGE':
      return t('Nouveau message de {{from}} : {{subject}}', params)
    case 'ANNOUNCEMENT':
      return t('Nouvelle annonce : {{title}}', params)
    case 'HOMEWORK':
      return t('Nouveau devoir de {{subject}} : {{title}}', params)
    case 'HOMEWORK_REVIEWED':
      return t('Devoir corrigé : {{title}} ({{score}}/20)', params)
    case 'GRADE':
      return t('Nouvelle note pour {{name}} en {{subject}} : {{score}}/{{max}}', params)
    case 'ABSENCE':
      return t(params.kind === 'LATE' ? 'Retard de {{name}} le {{date}}' : 'Absence de {{name}} le {{date}}',
        { name: params.name, date: formatDate(params.date) })
    case 'COMPLAINT_UPDATED':
      return t('Réclamation « {{subject}} » : {{status}}', { subject: params.subject, status: t(STATUS_LABELS[params.status as ComplaintStatus] ?? params.status) })
    case 'LIVE_SESSION':
      return t('Cours en direct planifié : {{title}} ({{date}})',
        { title: params.title, date: dateFormat({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(params.date)) })
    case 'QUIZ':
      return t('Nouveau quiz de {{subject}} : {{title}}', params)
    case 'RESOURCE':
      return t('Nouveau support de {{subject}} : {{title}}', params)
    case 'PHOTOS':
      return t('{{count}} nouvelles photos dans « {{title}} »', { count: Number(params.count), title: params.title })
    case 'APPOINTMENT': {
      const date = dateFormat({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(params.date))
      return params.status === 'CANCELLED'
        ? t('Rendez-vous du {{date}} annulé par {{who}}', { date, who: params.who })
        : t('Rendez-vous réservé par {{who}} le {{date}}', { date, who: params.who })
    }
    case 'POLL':
      return t('Nouveau sondage : {{question}}', params)
    case 'BEHAVIOR':
      return t(params.positive === 'true' ? '{{name}} a reçu un point positif : {{category}}' : 'Incident signalé pour {{name}} : {{category}}',
        { name: params.name, category: t(categoryInfo(params.category as BehaviorCategory)?.label ?? params.category) })
    case 'JUSTIFICATION': {
      const date = formatDate(params.date)
      if (params.status === 'ACCEPTED') return t('Justificatif accepté pour l\'absence de {{name}} du {{date}}', { name: params.name, date })
      if (params.status === 'REJECTED') return t('Justificatif refusé pour l\'absence de {{name}} du {{date}}', { name: params.name, date })
      return t('Nouveau justificatif d\'absence pour {{name}} ({{date}})', { name: params.name, date })
    }
  }
}
