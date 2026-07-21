import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeQuiz, makeDefaultCourseValue } from '@/test-utils'
import QuizzesPage from './page'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/components', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoleBasedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@/components/Tables', () => ({
  QuizzesTable: ({
    quizzes,
    onEditQuiz,
  }: {
    quizzes: { id: string; title: string }[]
    onEditQuiz: (q: unknown) => void
  }) => (
    <div data-testid="quizzes-table">
      {quizzes.map(q => (
        <div key={q.id}>
          <span>{q.title}</span>
          <button onClick={() => onEditQuiz(q)}>Edit {q.title}</button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Modals', () => ({
  EditQuizModal: ({
    opened,
    onClose,
    isCreating,
  }: {
    opened: boolean
    onClose: () => void
    isCreating: boolean
  }) =>
    opened ? (
      <div data-testid="edit-quiz-modal">
        {isCreating ? 'Create Modal' : 'Edit Modal'}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCourse.mockReturnValue(makeDefaultCourseValue())
})

describe('QuizzesPage', () => {
  it('renders "Quizzes" heading', async () => {
    renderWithProviders(<QuizzesPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /quizzes/i })).toBeInTheDocument()
    })
  })

  it('renders quiz titles from API', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ quizzes: [makeQuiz({ id: 'q-1', title: 'Quiz Alpha' })] })
      )
    )
    renderWithProviders(<QuizzesPage />)
    await waitFor(() => {
      expect(screen.getByText('Quiz Alpha')).toBeInTheDocument()
    })
  })

  it('"New Quiz" button opens create modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuizzesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new quiz/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new quiz/i }))

    await waitFor(() => {
      expect(screen.getByTestId('edit-quiz-modal')).toBeInTheDocument()
      expect(screen.getByText('Create Modal')).toBeInTheDocument()
    })
  })

  it('edit button in table opens edit modal', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ quizzes: [makeQuiz({ id: 'q-1', title: 'Quiz Alpha' })] })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<QuizzesPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit quiz alpha/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit quiz alpha/i }))

    await waitFor(() => {
      expect(screen.getByTestId('edit-quiz-modal')).toBeInTheDocument()
      expect(screen.getByText('Edit Modal')).toBeInTheDocument()
    })
  })
})
