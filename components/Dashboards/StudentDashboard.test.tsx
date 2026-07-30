import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeDefaultCourseValue, makeQuiz } from '@/test-utils'

vi.mock('@prisma/client', () => ({ Quiz: {} }))

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@/components/StudentQuizCard', () => ({
  default: ({ quiz }: { quiz: { title: string } }) => (
    <div data-testid="quiz-card">{quiz.title}</div>
  ),
}))

// Dynamic import so mocks are registered before the module loads
const { default: StudentDashboard } = await import('./StudentDashboard')

describe('StudentDashboard', () => {
  beforeEach(() => {
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
  })

  it('shows loading text while fetching', () => {
    server.use(
      http.get('/api/quizzes', async () => {
        await new Promise(() => {}) // never resolves
        return HttpResponse.json({})
      })
    )

    renderWithProviders(<StudentDashboard />)

    expect(screen.getByText('Loading quizzes...')).toBeInTheDocument()
  })

  it('renders quiz cards after data loads', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ quizzes: [makeQuiz({ title: 'Quiz 1' })] })
      )
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByTestId('quiz-card')).toBeInTheDocument()
    })
    expect(screen.getByText('Quiz 1')).toBeInTheDocument()
  })

  it('shows empty state when no quizzes', async () => {
    // default MSW handler returns { quizzes: [] }
    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(
        screen.getByText('No quizzes available at this time.')
      ).toBeInTheDocument()
    })
  })

  it('shows error alert when fetch fails', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      )
    )

    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch quizzes/i)).toBeInTheDocument()
    })
  })

  it('displays course code as header', async () => {
    renderWithProviders(<StudentDashboard />)

    await waitFor(() => {
      expect(screen.getByText('CSC494')).toBeInTheDocument()
    })
  })
})
