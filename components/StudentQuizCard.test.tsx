import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentQuizCard from './StudentQuizCard'
import { renderWithProviders, makeQuiz } from '@/test-utils'

const mockPush = vi.fn()
const mockUseCourse = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/course-context', () => ({
  useCourse: () => mockUseCourse(),
}))

describe('StudentQuizCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: {
      course: {
        code: 'CSC494',
      },
      term: {
        name: 'Fall 2024',
      },
    },
    setSelectedCourseOffering: vi.fn(),
    })
  })

  it('renders the quiz title', () => {
    const quiz = makeQuiz({ title: 'Midterm Practice Quiz' })
    renderWithProviders(<StudentQuizCard quiz={quiz as never} />)
    expect(screen.getByText('Midterm Practice Quiz')).toBeInTheDocument()
  })

  it('renders the "Take Quiz" button', () => {
    const quiz = makeQuiz()
    renderWithProviders(<StudentQuizCard quiz={quiz as never} />)
    expect(screen.getByRole('button', { name: /Take Quiz/i })).toBeInTheDocument()
  })

  it('navigates to the quiz page when "Take Quiz" is clicked', async () => {
    const user = userEvent.setup()
    const quiz = makeQuiz({ id: 'quiz-42' })
    renderWithProviders(<StudentQuizCard quiz={quiz as never} />)

    await user.click(screen.getByRole('button', { name: /Take Quiz/i }))
    expect(mockPush).toHaveBeenCalledWith('/CSC494/Fall-2024/quiz/quiz-42')
  })
})
