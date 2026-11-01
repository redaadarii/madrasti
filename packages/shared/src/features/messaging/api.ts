import { api } from '../../http'
import type { Role } from '../../types'

export interface Contact {
  id: number
  name: string
  role: Role
}

export interface ConversationSummary {
  id: number
  subject: string
  participants: Contact[]
  lastMessageAt: string
  lastMessagePreview: string
  unread: boolean
}

export interface ChatMessage {
  id: number
  senderId: number
  senderName: string
  body: string
  createdAt: string
  mine: boolean
}

export const messagingApi = {
  inbox: () => api<ConversationSummary[]>('/conversations'),
  unreadCount: () => api<{ count: number }>('/conversations/unread-count'),
  contacts: (q?: string) => api<Contact[]>('/conversations/contacts', { query: { q } }),
  start: (input: { recipientIds: number[]; subject: string; body: string }) =>
    api<ConversationSummary>('/conversations', { method: 'POST', body: input }),
  read: (id: number) => api<ChatMessage[]>(`/conversations/${id}/messages`),
  reply: (id: number, body: string) => api<ChatMessage>(`/conversations/${id}/messages`, { method: 'POST', body: { body } }),
}
