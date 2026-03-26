import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstructorTabs } from './InstructorTabs'
import {
  renderWithProviders,
  makeDefaultCourseValue,
  makeCourseOffering,
} from '@/test-utils'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockUsePathname(),
}))

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHILD_TEXT = 'Page Content'
const children = <div data-testid="child-content">{CHILD_TEXT}</div>

describe('InstructorTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/quiz')
  })

  it('renders all tabs for an INSTRUCTOR', () => {
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Question Bank' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quizzes' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Students' })).toBeInTheDocument()
  })

  it('renders all tabs for a TA', () => {
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'TA' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Quizzes' })).toBeInTheDocument()
  })

  it('does not render tabs for a STUDENT — just renders children', () => {
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'STUDENT' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('does not render tabs when no course offering is selected', () => {
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: null,
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('does not render tabs while course context is loading', () => {
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: true,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('navigates to the correct route when a tab is clicked', async () => {
    const user = userEvent.setup()
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    await user.click(screen.getByRole('tab', { name: 'Quizzes' }))
    expect(mockPush).toHaveBeenCalledWith('/quizzes')
  })

  it('sets the Dashboard tab as active when pathname is /quiz', () => {
    mockUsePathname.mockReturnValue('/quiz')
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    const dashboardTab = screen.getByRole('tab', { name: 'Dashboard' })
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true')
  })

  it('sets the Quizzes tab as active when pathname includes /quizzes', () => {
    mockUsePathname.mockReturnValue('/quizzes')
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    const quizzesTab = screen.getByRole('tab', { name: 'Quizzes' })
    expect(quizzesTab).toHaveAttribute('aria-selected', 'true')
  })

  it('does not render tabs on the course selection page (/)', () => {
    mockUsePathname.mockReturnValue('/')
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({
        selectedCourseOffering: makeCourseOffering({ role: 'INSTRUCTOR' }),
        loading: false,
      })
    )
    renderWithProviders(<InstructorTabs>{children}</InstructorTabs>)

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
