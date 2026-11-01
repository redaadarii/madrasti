import type { LinkProps } from '@tanstack/react-router'
import {
  BarChart3,
  Banknote,
  BookOpenCheck,
  BusFront,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ClipboardList,
  Clock4,
  Gavel,
  GraduationCap,
  Images,
  LayoutDashboard,
  Library,
  type LucideIcon,
  Megaphone,
  MessageSquareText,
  MessageSquareWarning,
  MessagesSquare,
  Presentation,
  Puzzle,
  School,
  ScrollText,
  ShieldCheck,
  Target,
  Sparkles,
  Users,
  UtensilsCrossed,
  Video,
  Vote,
} from 'lucide-react'
import type { Role } from '@madrasti/shared/types'

export interface NavItem {
  to: NonNullable<LinkProps['to']>
  label: string
  icon: LucideIcon
  roles: Role[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const ALL: Role[] = ['ADMIN', 'DIRECTOR', 'TEACHER', 'PARENT', 'STUDENT']
const STAFF: Role[] = ['ADMIN', 'DIRECTOR', 'TEACHER']
const MANAGERS: Role[] = ['ADMIN', 'DIRECTOR']

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ALL },
      { to: '/stats', label: 'Statistiques', icon: BarChart3, roles: STAFF },
    ],
  },
  {
    title: 'Vie scolaire',
    items: [
      { to: '/students', label: 'Élèves', icon: GraduationCap, roles: STAFF },
      { to: '/classrooms', label: 'Classes', icon: Users, roles: STAFF },
      { to: '/timetable', label: 'Emploi du temps', icon: Clock4, roles: ALL },
      { to: '/calendar', label: 'Agenda', icon: CalendarDays, roles: ALL },
      { to: '/attendance', label: 'Absences', icon: CalendarX2, roles: STAFF },
      { to: '/behavior', label: 'Comportement', icon: Sparkles, roles: ALL },
      { to: '/competencies', label: 'Compétences', icon: Target, roles: STAFF },
      { to: '/council', label: 'Conseil de classe', icon: Gavel, roles: STAFF },
    ],
  },
  {
    title: 'Pédagogie',
    items: [
      { to: '/homework', label: 'Devoirs', icon: BookOpenCheck, roles: [...STAFF, 'STUDENT'] },
      { to: '/quizzes', label: 'Quiz en ligne', icon: Puzzle, roles: [...STAFF, 'STUDENT'] },
      { to: '/courses', label: 'Cours en ligne', icon: Presentation, roles: ALL },
      { to: '/live', label: 'Classes en direct', icon: Video, roles: ALL },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: '/messages', label: 'Messagerie', icon: MessagesSquare, roles: ALL },
      { to: '/announcements', label: 'Annonces', icon: Megaphone, roles: ALL },
      { to: '/appointments', label: 'Rendez-vous', icon: CalendarClock, roles: ['DIRECTOR', 'TEACHER', 'PARENT'] },
      { to: '/polls', label: 'Sondages', icon: Vote, roles: ALL },
      { to: '/complaints', label: 'Réclamations', icon: MessageSquareWarning, roles: ALL },
      { to: '/gallery', label: 'Galerie photo', icon: Images, roles: ALL },
      { to: '/sms', label: 'SMS', icon: MessageSquareText, roles: MANAGERS },
    ],
  },
  {
    title: 'Services',
    items: [
      { to: '/services', label: 'Transport & activités', icon: BusFront, roles: ['ADMIN', 'DIRECTOR', 'PARENT', 'STUDENT'] },
      { to: '/canteen', label: 'Cantine', icon: UtensilsCrossed, roles: ALL },
      { to: '/library', label: 'Bibliothèque', icon: Library, roles: ALL },
      { to: '/payments', label: 'Finance', icon: Banknote, roles: MANAGERS },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/admissions', label: 'Pré-inscriptions', icon: ClipboardList, roles: MANAGERS },
      { to: '/schools', label: 'Écoles', icon: School, roles: ['ADMIN'] },
      { to: '/admin/users', label: 'Comptes', icon: ShieldCheck, roles: ['ADMIN'] },
      { to: '/admin/audit', label: 'Journal d\'audit', icon: ScrollText, roles: ['ADMIN'] },
    ],
  },
]

/** Sections du menu visibles pour un rôle (les sections vides disparaissent). */
export const navigationFor = (role: Role): NavSection[] =>
  NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) }))
    .filter((section) => section.items.length > 0)
