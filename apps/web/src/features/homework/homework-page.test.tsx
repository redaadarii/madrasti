import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { meQueryOptions } from '@madrasti/shared/features/auth/queries'
import { createTestQueryClient, mockApi, renderWithQuery } from '@/test/utils'
import type { Assignment } from '@madrasti/shared/features/homework/api'
import { HomeworkPage } from './homework-page'

const fractions: Assignment = {
  id: 7, classroomId: 2, classroomName: 'CM1-B', teacherId: 3, teacherName: 'Nadia Alaoui', subject: 'Mathématiques',
  title: 'Exercices sur les fractions', description: 'Exercices 4, 5 et 7 page 52.', dueDate: '2099-01-01',
  createdAt: '2026-10-30T08:00:00Z', submissionCount: 0, submission: null,
}

describe('HomeworkPage — espace élève', () => {
  afterEach(() => vi.restoreAllMocks())

  it("permet à l'élève de rendre un devoir", async () => {
    let sent: unknown
    mockApi((url, init) => {
      if (init.method === 'PUT' && url.pathname === '/api/assignments/7/submission') {
        sent = JSON.parse(String(init.body))
        return { body: { id: 1, assignmentId: 7, content: 'réponse', score: null } }
      }
      return { body: [fractions] }
    })
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(meQueryOptions.queryKey, { id: 20, role: 'STUDENT', firstName: 'Adam', lastName: 'Adari' } as never)
    const user = userEvent.setup()
    renderWithQuery(<HomeworkPage />, queryClient)

    expect(await screen.findByText('Exercices sur les fractions')).toBeInTheDocument()
    expect(screen.getByText('À rendre')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rendre le devoir' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Ma réponse'), '3/4 + 1/8 = 7/8')
    await user.click(within(dialog).getByRole('button', { name: 'Rendre le devoir' }))

    await waitFor(() => expect(sent).toEqual({ content: '3/4 + 1/8 = 7/8' }))
    expect(await screen.findByText('Devoir rendu 🎉')).toBeInTheDocument()
  })
})
