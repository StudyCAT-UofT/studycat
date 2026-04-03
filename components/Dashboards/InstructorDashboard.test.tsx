import React from 'react'
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeDefaultCourseValue, makeQuiz } from '@/test-utils'

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@/components/Charts', () => ({
  AttemptsOverTimeChart: () => <div data-testid="attempts-chart" />,
}))

const { default: InstructorDashboard } = await import('./InstructorDashboard')

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe('InstructorDashboard', () => {
  beforeEach(() => {
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
  })

  it('shows "Loading quizzes..." while fetching', () => {
    server.use(
      http.get('/api/quizzes', async () => {
        await new Promise(() => {}) // never resolves
        return HttpResponse.json({})
      })
    )

    renderWithProviders(<InstructorDashboard />)

    expect(screen.getByText('Loading quizzes...')).toBeInTheDocument()
  })

  it('renders quiz title in table after data loads', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ quizzes: [makeQuiz({ title: 'Test Quiz 1' })] })
      ),
      http.get('/api/data/attempt', () =>
        HttpResponse.json({ attempts: [] })
      )
    )

    renderWithProviders(<InstructorDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Test Quiz 1')).toBeInTheDocument()
    })
  })

  it('shows "No quizzes found for this course." when empty', async () => {
    // default MSW handler returns { quizzes: [] }
    renderWithProviders(<InstructorDashboard />)

    await waitFor(() => {
      expect(
        screen.getByText('No quizzes found for this course.')
      ).toBeInTheDocument()
    })
  })

  it('shows error message when fetch fails', async () => {
    server.use(
      http.get('/api/quizzes', () =>
        HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
      )
    )

    renderWithProviders(<InstructorDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch quizzes/i)).toBeInTheDocument()
    })
  })

  it('renders "Dashboard" heading', () => {
    renderWithProviders(<InstructorDashboard />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
