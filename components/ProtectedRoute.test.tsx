import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockUseAuth(),
}))

// Mock AuthenticatedLayout
vi.mock('./AuthenticatedLayout', () => ({
  AuthenticatedLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="authenticated-layout">{children}</div>
  ),
}))

// Mock Mantine components
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core')
  return {
    ...actual,
    Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Button: ({ children, href }: { children: React.ReactNode; href?: string }) => (
      <a href={href}>{children}</a>
    ),
    Loader: () => <div data-testid="loader">Loading...</div>,
    Center: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'testuser', name: 'Test User' },
      loading: false,
      isAuthenticated: true,
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div data-testid="protected-content">Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('authenticated-layout')).toBeInTheDocument()
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('shows loading state when loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('loader')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('shows access denied message when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('You need to be logged in to access this page.')).toBeInTheDocument()
    expect(screen.getByText('Go to Login')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('renders custom fallback when provided and user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    })

    const customFallback = <div data-testid="custom-fallback">Custom Fallback</div>

    render(
      <AuthProvider>
        <ProtectedRoute fallback={customFallback}>
          <div>Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument()
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument()
  })

  it('shows access denied when user is null even if isAuthenticated is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: true, // Edge case: isAuthenticated true but user is null
    })

    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Content</div>
        </ProtectedRoute>
      </AuthProvider>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })
})

