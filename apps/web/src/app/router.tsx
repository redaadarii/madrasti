import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from '@/components/layout/app-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { meQueryOptions } from '@madrasti/shared/features/auth/queries'
import { MANAGER_ROLES, type Role, STAFF_ROLES } from '@madrasti/shared/types'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet })

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('@/features/landing/landing-page'), 'LandingPage'),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search.redirect === 'string' ? { redirect: search.redirect } : {},
  beforeLoad: ({ context }) => {
    if (context.queryClient.getQueryData(meQueryOptions.queryKey)) throw redirect({ to: '/dashboard' })
  },
  component: lazyRouteComponent(() => import('@/features/auth/login-page'), 'LoginPage'),
})

const preRegistrationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pre-inscription',
  component: lazyRouteComponent(() => import('@/features/admissions/pre-registration-page'), 'PreRegistrationPage'),
})

/** Layout authentifié : charge l'utilisateur courant une fois pour toutes les pages enfants. */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context, location }) => {
    // Le cookie de session est invisible au JavaScript : c'est l'appel /auth/me qui dit si l'on est connecté.
    try {
      return { user: await context.queryClient.ensureQueryData(meQueryOptions) }
    } catch {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppShell,
  pendingComponent: () => <Skeleton className="m-8 h-64" />,
})

const requireRole = (roles: Role[]) => ({ context }: { context: { user: { role: Role } } }) => {
  if (!roles.includes(context.user.role)) throw redirect({ to: '/dashboard' })
}

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: lazyRouteComponent(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage'),
})

const studentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/students',
  validateSearch: (search: Record<string, unknown>): { classroomId?: number } =>
    search.classroomId ? { classroomId: Number(search.classroomId) } : {},
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/students/students-page'), 'StudentsPage'),
})

const studentDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/students/$studentId',
  params: {
    parse: ({ studentId }) => ({ studentId: Number(studentId) }),
    stringify: ({ studentId }) => ({ studentId: String(studentId) }),
  },
  component: lazyRouteComponent(() => import('@/features/students/student-detail-page'), 'StudentDetailPage'),
})

const classroomsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/classrooms',
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/classrooms/classrooms-page'), 'ClassroomsPage'),
})

const attendanceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/attendance',
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/attendance/attendance-page'), 'AttendancePage'),
})

const announcementsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/announcements',
  component: lazyRouteComponent(() => import('@/features/announcements/announcements-page'), 'AnnouncementsPage'),
})

const homeworkRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/homework',
  beforeLoad: requireRole([...STAFF_ROLES, 'STUDENT']),
  component: lazyRouteComponent(() => import('@/features/homework/homework-page'), 'HomeworkPage'),
})

const liveRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/live',
  component: lazyRouteComponent(() => import('@/features/live/live-page'), 'LivePage'),
})

const liveRoomRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/live/$sessionId',
  params: {
    parse: ({ sessionId }) => ({ sessionId: Number(sessionId) }),
    stringify: ({ sessionId }) => ({ sessionId: String(sessionId) }),
  },
  component: lazyRouteComponent(() => import('@/features/live/live-room-page'), 'LiveRoomPage'),
})

const timetableRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/timetable',
  component: lazyRouteComponent(() => import('@/features/timetable/timetable-page'), 'TimetablePage'),
})

const calendarRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/calendar',
  component: lazyRouteComponent(() => import('@/features/calendar/calendar-page'), 'CalendarPage'),
})

const messagesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/messages',
  component: lazyRouteComponent(() => import('@/features/messaging/messages-page'), 'MessagesPage'),
})

const complaintsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/complaints',
  component: lazyRouteComponent(() => import('@/features/complaints/complaints-page'), 'ComplaintsPage'),
})

const quizzesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/quizzes',
  beforeLoad: requireRole([...STAFF_ROLES, 'STUDENT']),
  component: lazyRouteComponent(() => import('@/features/quizzes/quizzes-page'), 'QuizzesPage'),
})

const quizTakeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/quizzes/$quizId',
  params: {
    parse: ({ quizId }) => ({ quizId: Number(quizId) }),
    stringify: ({ quizId }) => ({ quizId: String(quizId) }),
  },
  component: lazyRouteComponent(() => import('@/features/quizzes/quiz-take-page'), 'QuizTakePage'),
})

const reportCardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/students/$studentId/report-card',
  params: {
    parse: ({ studentId }) => ({ studentId: Number(studentId) }),
    stringify: ({ studentId }) => ({ studentId: String(studentId) }),
  },
  component: lazyRouteComponent(() => import('@/features/report-card/report-card-page'), 'ReportCardPage'),
})

const servicesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/services',
  beforeLoad: requireRole(['ADMIN', 'DIRECTOR', 'PARENT', 'STUDENT']),
  component: lazyRouteComponent(() => import('@/features/services/services-page'), 'ServicesPage'),
})

const libraryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/library',
  component: lazyRouteComponent(() => import('@/features/library/library-page'), 'LibraryPage'),
})

const admissionsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/admissions',
  beforeLoad: requireRole(MANAGER_ROLES),
  component: lazyRouteComponent(() => import('@/features/admissions/admissions-page'), 'AdmissionsPage'),
})

const paymentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/payments',
  beforeLoad: requireRole(MANAGER_ROLES),
  component: lazyRouteComponent(() => import('@/features/payments/finance-page'), 'FinancePage'),
})

const simulatedCheckoutRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/pay/simulated',
  validateSearch: (search: Record<string, unknown>): { session: string } => ({ session: String(search.session ?? '') }),
  beforeLoad: requireRole(['PARENT']),
  component: lazyRouteComponent(() => import('@/features/payments/simulated-checkout-page'), 'SimulatedCheckoutPage'),
})

const paymentReturnRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/payments/return',
  validateSearch: (search: Record<string, unknown>): { session: string } => ({ session: String(search.session ?? '') }),
  beforeLoad: requireRole(['PARENT']),
  component: lazyRouteComponent(() => import('@/features/payments/payment-return-page'), 'PaymentReturnPage'),
})

const statsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/stats',
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/stats/stats-page'), 'StatsPage'),
})

const councilRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/council',
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/council/council-page'), 'CouncilPage'),
})

const coursesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/courses',
  component: lazyRouteComponent(() => import('@/features/courses/courses-page'), 'CoursesPage'),
})

const galleryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/gallery',
  component: lazyRouteComponent(() => import('@/features/gallery/gallery-page'), 'GalleryPage'),
})

const smsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/sms',
  beforeLoad: requireRole(MANAGER_ROLES),
  component: lazyRouteComponent(() => import('@/features/sms/sms-page'), 'SmsPage'),
})

const appointmentsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/appointments',
  beforeLoad: requireRole(['DIRECTOR', 'TEACHER', 'PARENT']),
  component: lazyRouteComponent(() => import('@/features/appointments/appointments-page'), 'AppointmentsPage'),
})

const pollsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/polls',
  component: lazyRouteComponent(() => import('@/features/polls/polls-page'), 'PollsPage'),
})

const behaviorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/behavior',
  component: lazyRouteComponent(() => import('@/features/behavior/behavior-page'), 'BehaviorPage'),
})

const competenciesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/competencies',
  beforeLoad: requireRole(STAFF_ROLES),
  component: lazyRouteComponent(() => import('@/features/competencies/competencies-page'), 'CompetenciesPage'),
})

const canteenRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/canteen',
  component: lazyRouteComponent(() => import('@/features/canteen/canteen-page'), 'CanteenPage'),
})

const schoolsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/schools',
  beforeLoad: requireRole(['ADMIN']),
  component: lazyRouteComponent(() => import('@/features/schools/schools-page'), 'SchoolsPage'),
})

const auditRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/admin/audit',
  beforeLoad: requireRole(['ADMIN']),
  component: lazyRouteComponent(() => import('@/features/audit/audit-page'), 'AuditPage'),
})

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/admin/users',
  beforeLoad: requireRole(['ADMIN']),
  component: lazyRouteComponent(() => import('@/features/users/users-page'), 'UsersPage'),
})

const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  preRegistrationRoute,
  appRoute.addChildren([
    dashboardRoute,
    studentsRoute,
    studentDetailRoute,
    classroomsRoute,
    attendanceRoute,
    announcementsRoute,
    homeworkRoute,
    liveRoute,
    liveRoomRoute,
    timetableRoute,
    calendarRoute,
    messagesRoute,
    complaintsRoute,
    quizzesRoute,
    quizTakeRoute,
    reportCardRoute,
    servicesRoute,
    libraryRoute,
    admissionsRoute,
    paymentsRoute,
    simulatedCheckoutRoute,
    paymentReturnRoute,
    statsRoute,
    councilRoute,
    coursesRoute,
    galleryRoute,
    smsRoute,
    appointmentsRoute,
    pollsRoute,
    behaviorRoute,
    canteenRoute,
    competenciesRoute,
    schoolsRoute,
    usersRoute,
    auditRoute,
  ]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
