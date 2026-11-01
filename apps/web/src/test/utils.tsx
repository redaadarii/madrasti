import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import { type ReactElement, Suspense } from 'react'
import { vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'

export const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

export function renderWithQuery(ui: ReactElement, queryClient = createTestQueryClient()) {
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}>{ui}</Suspense>
        <Toaster />
      </QueryClientProvider>,
    ),
  }
}

/** Monte un composant de page sous un routeur mémoire minimal (une route + /dashboard). */
export async function renderRoute(path: string, component: () => ReactElement, initialUrl = path) {
  const queryClient = createTestQueryClient()
  const rootRoute = createRootRoute({ component: Outlet })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path, component }),
      createRoute({ getParentRoute: () => rootRoute, path: '/dashboard', component: () => <h1>Tableau de bord</h1> }),
    ]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as never} />
    </QueryClientProvider>,
  )
  await router.load()
  return { router, queryClient, ...result }
}

type Handler = (url: URL, init: RequestInit) => { status?: number; body?: unknown }

/** Remplace fetch par un routeur de réponses JSON ; renvoie le mock pour inspecter les appels. */
export function mockApi(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const { status = 200, body } = handler(url, init)
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}
