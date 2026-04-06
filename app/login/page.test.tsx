import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils'
import LoginPage from './page'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockUseAuth = vi.fn()
vi.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}))

const mockLogin = vi.fn()
vi.mock('@/lib/client-auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  logout: vi.fn(),
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_AUTH_MODE = 'simple'
  mockUseAuth.mockReturnValue({
    user: null,
    loading: false,
    isAuthenticated: false,
    isAdmin: false,
    refreshUser: vi.fn(),
  })
})

describe('LoginPage', () => {
  it('shows "Checking session..." initially when authLoading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isAuthenticated: false,
      isAdmin: false,
      refreshUser: vi.fn(),
    })
    renderWithProviders(<LoginPage />)
    expect(screen.getByText(/checking session/i)).toBeInTheDocument()
  })

  it('shows UTORid input in simple auth mode', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'simple'
    renderWithProviders(<LoginPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your UTORid')).toBeInTheDocument()
    })
  })

  it('shows "Login with UTORid" button in shibboleth mode', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'shibboleth'
    renderWithProviders(<LoginPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login with utorid/i })).toBeInTheDocument()
    })
  })

  it('redirects to / when user is already logged in', async () => {
    mockUseAuth.mockReturnValue({
      user: { userId: 'user-1', username: 'testuser' },
      loading: false,
      isAuthenticated: true,
      isAdmin: false,
      refreshUser: vi.fn(),
    })
    renderWithProviders(<LoginPage />)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('calls login and redirects to / on success', async () => {
    const mockRefreshUser = vi.fn().mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAdmin: false,
      refreshUser: mockRefreshUser,
    })
    mockLogin.mockResolvedValue({ success: true })

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your UTORid')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Enter your UTORid'), 'testuser')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('shows error alert on login failure', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
      isAdmin: false,
      refreshUser: vi.fn(),
    })
    mockLogin.mockResolvedValue({ error: 'Invalid credentials' })

    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your UTORid')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Enter your UTORid'), 'baduser')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })
})
