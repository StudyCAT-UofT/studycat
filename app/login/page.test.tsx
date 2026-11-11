import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
const mockRedirectToShibbolethLogin = vi.fn()
vi.mock('@/lib/client-auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  logout: vi.fn(),
  redirectToShibbolethLogin: () => mockRedirectToShibbolethLogin(),
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

  it('goes to the Shibboleth SP when the "Login with UTORid" button is clicked', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'shibboleth'
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(await screen.findByRole('button', { name: /login with utorid/i }))
    expect(mockRedirectToShibbolethLogin).toHaveBeenCalledTimes(1)
  })

  describe('shibboleth auto-redirect', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_AUTH_MODE = 'shibboleth'
      vi.stubEnv('NODE_ENV', 'production')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      window.history.replaceState(null, '', '/')
    })

    it('redirects straight to the Shibboleth SP in production', async () => {
      renderWithProviders(<LoginPage />)
      await waitFor(() => {
        expect(mockRedirectToShibbolethLogin).toHaveBeenCalledTimes(1)
      })
    })

    it('does not redirect in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      renderWithProviders(<LoginPage />)
      await screen.findByRole('button', { name: /login with utorid/i })
      expect(mockRedirectToShibbolethLogin).not.toHaveBeenCalled()
    })

    it('does not redirect in simple mode', async () => {
      process.env.NEXT_PUBLIC_AUTH_MODE = 'simple'
      renderWithProviders(<LoginPage />)
      await screen.findByPlaceholderText('Enter your UTORid')
      expect(mockRedirectToShibbolethLogin).not.toHaveBeenCalled()
    })

    it('does not redirect while the session is still loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false,
        isAdmin: false,
        refreshUser: vi.fn(),
      })
      renderWithProviders(<LoginPage />)
      expect(screen.getByText(/checking session/i)).toBeInTheDocument()
      expect(mockRedirectToShibbolethLogin).not.toHaveBeenCalled()
    })

    it('shows the callback error and does not redirect when ?error= is present', async () => {
      window.history.replaceState(null, '', '/login?error=user_not_found')
      renderWithProviders(<LoginPage />)
      expect(await screen.findByText(/not registered in catalyze/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /login with utorid/i })).toBeInTheDocument()
      expect(mockRedirectToShibbolethLogin).not.toHaveBeenCalled()
    })

    it('shows a generic message for an unknown callback error', async () => {
      window.history.replaceState(null, '', '/login?error=something_else')
      renderWithProviders(<LoginPage />)
      expect(await screen.findByText(/login failed/i)).toBeInTheDocument()
      expect(mockRedirectToShibbolethLogin).not.toHaveBeenCalled()
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
