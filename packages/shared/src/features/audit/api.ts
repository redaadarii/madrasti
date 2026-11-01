export type AuditAction =
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'TOKEN_REUSE' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'PASSWORD_RESET'
  | 'PAYMENT_RECORDED' | 'PAYMENT_ONLINE' | 'STUDENTS_IMPORTED' | 'STUDENT_DELETED'

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCESS: 'Connexion',
  LOGIN_FAILED: 'Connexion refusée',
  TOKEN_REUSE: 'Session mobile révoquée (jeton réutilisé)',
  USER_CREATED: 'Compte créé',
  USER_UPDATED: 'Compte modifié',
  USER_DELETED: 'Compte supprimé',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PAYMENT_RECORDED: 'Encaissement',
  PAYMENT_ONLINE: 'Paiement en ligne',
  STUDENTS_IMPORTED: 'Import d\'élèves',
  STUDENT_DELETED: 'Élève supprimé',
}
