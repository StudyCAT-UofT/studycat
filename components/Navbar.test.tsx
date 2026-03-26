import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { Navbar } from './Navbar'
import {
  renderWithProviders,
  makeDefaultAuthValue,
  makeDefaultCourseValue,
} from '@/test-utils'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockPush = vi.fn()
const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockUsePathname(),
}))

const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}))

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@/lib/client-auth', () => ({
  logout: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock AppShell.Header since it is a compound component that expects AppShell context
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core')
  return {
    ...actual,
    AppShell: {
      ...(actual as Record<string, unknown>).AppShell as object,
      Header: ({ children }: { children: React.ReactNode }) => (
        <header data-testid="navbar-header">{children}</header>
      ),
    },
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupMocks(pathname = '/quiz') {
  mockUsePathname.mockReturnValue(pathname)
  mockUseAuth.mockReturnValue(makeDefaultAuthValue())
  mockUseCourse.mockReturnValue(makeDefaultCourseValue())
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the StudyCAT brand', async () => {
    setupMocks()
    renderWithProviders(<Navbar />)
    expect(screen.getByText('StudyCAT')).toBeInTheDocument()
  })

  it('renders the logged-in username', async () => {
    mockUsePathname.mockReturnValue('/quiz')
    mockUseAuth.mockReturnValue(makeDefaultAuthValue({ user: { userId: 'u1', username: 'janedoe' } }))
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
    renderWithProviders(<Navbar />)
    expect(screen.getByText('janedoe')).toBeInTheDocument()
  })

  it('hides the course picker on the dashboard (/)', async () => {
    setupMocks('/')
    renderWithProviders(<Navbar />)
    expect(screen.queryByPlaceholderText('Select course')).not.toBeInTheDocument()
  })

  it('shows the course picker on non-dashboard routes', async () => {
    setupMocks('/quizzes')
    mockUseCourse.mockReturnValue(
      makeDefaultCourseValue({ courseOfferings: [{ id: 'o-1', display: 'CSC494 F24', course: { id: 'c-1', code: 'CSC494', title: 'Topics in CS' }, term: { id: 't-1', name: 'Fall 2024' }, role: 'INSTRUCTOR' }] })
    )
    renderWithProviders(<Navbar />)
    expect(screen.getByPlaceholderText('Select course')).toBeInTheDocument()
  })

  it('hides the course picker on admin routes', async () => {
    setupMocks('/admin')
    renderWithProviders(<Navbar />)
    expect(screen.queryByPlaceholderText('Select course')).not.toBeInTheDocument()
  })

  it('shows Admin Dashboard button when user is admin', async () => {
    setupMocks()
    server.use(
      http.get('/api/admin/status', () => HttpResponse.json({ admin: true }))
    )
    renderWithProviders(<Navbar />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Admin Dashboard/i })).toBeInTheDocument()
    })
  })

  it('hides Admin Dashboard button when user is not admin', async () => {
    setupMocks()
    // Default MSW handler returns { admin: false }
    renderWithProviders(<Navbar />)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Admin Dashboard/i })).not.toBeInTheDocument()
    })
  })

  it('navigates to / when StudyCAT brand is clicked', async () => {
    const user = userEvent.setup()
    setupMocks('/quizzes')
    renderWithProviders(<Navbar />)

    await user.click(screen.getByText('StudyCAT'))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('calls logout and navigates to /login when Logout is clicked', async () => {
    const user = userEvent.setup()
    setupMocks()
    renderWithProviders(<Navbar />)

    // Open user menu
    await user.click(screen.getByText('testuser'))
    const logoutItem = await screen.findByText('Logout')
    await user.click(logoutItem)

    const { logout } = await import('@/lib/client-auth')
    expect(logout).toHaveBeenCalled()
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})
