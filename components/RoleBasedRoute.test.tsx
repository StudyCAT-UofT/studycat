import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RoleBasedRoute } from './RoleBasedRoute'
import { CourseProvider } from '@/lib/course-context'

// Mock the course context
const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useCourse: () => mockUseCourse(),
}))

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Mantine components
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core')
  return {
    ...actual,
    Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Alert: ({ children, title }: { children: React.ReactNode; title?: string }) => (
      <div>
        {title && <div>{title}</div>}
        {children}
      </div>
    ),
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
    Loader: () => <div data-testid="loader">Loading...</div>,
    Center: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('RoleBasedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user has required role (requireRoles)', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'INSTRUCTOR' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }}>
          <div data-testid="protected-content">Protected Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })

  it('renders children when user has one of required roles (requireAnyRole)', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'TA' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireAnyRole: ['INSTRUCTOR', 'TA'] }}>
          <div data-testid="protected-content">Protected Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('shows loading state when course data is loading', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: null,
      loading: true,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByTestId('loader')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('shows access denied when user does not have required role', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('shows custom unauthorized message when provided', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute
          permissions={{ requireRoles: ['INSTRUCTOR'] }}
          unauthorizedMessage="Custom unauthorized message"
        >
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByText('Custom unauthorized message')).toBeInTheDocument()
  })

  it('renders custom fallback when provided and user lacks permission', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    const customFallback = <div data-testid="custom-fallback">Custom Fallback</div>

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }} fallback={customFallback}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })

  it('redirects unauthorized users when course data is loaded', async () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }} redirectTo="/dashboard">
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('denies access when user role is undefined', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: undefined },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR'] }}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('shows default message for requireAnyRole when unauthorized', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireAnyRole: ['INSTRUCTOR', 'TA'] }}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByText(/This page is only accessible to instructor or ta/i)).toBeInTheDocument()
  })

  it('shows default message for requireRoles when unauthorized', () => {
    mockUseCourse.mockReturnValue({
      selectedCourseOffering: { id: '1', role: 'STUDENT' },
      loading: false,
    })

    render(
      <CourseProvider>
        <RoleBasedRoute permissions={{ requireRoles: ['INSTRUCTOR', 'TA'] }}>
          <div>Content</div>
        </RoleBasedRoute>
      </CourseProvider>
    )

    expect(screen.getByText(/This page requires instructor and ta access/i)).toBeInTheDocument()
  })
})

