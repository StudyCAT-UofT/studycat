import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { AdminNavbar } from './AdminNavbar'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

// Mock AppShell.Navbar to avoid AppShell context requirement
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core')
  return {
    ...actual,
    AppShell: {
      ...(actual as Record<string, unknown>).AppShell as object,
      Navbar: ({ children }: { children: React.ReactNode }) => (
        <nav data-testid="admin-navbar">{children}</nav>
      ),
    },
  }
})

// ─── Test data ────────────────────────────────────────────────────────────────

const links = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Courses', href: '/admin/courses' },
]

describe('AdminNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin/users')
  })

  it('renders all nav link labels', () => {
    renderWithProviders(<AdminNavbar links={links} />)
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Courses')).toBeInTheDocument()
  })

  it('links have correct href attributes', () => {
    renderWithProviders(<AdminNavbar links={links} />)
    const usersLink = screen.getByRole('link', { name: 'Users' })
    expect(usersLink).toHaveAttribute('href', '/admin/users')
    const coursesLink = screen.getByRole('link', { name: 'Courses' })
    expect(coursesLink).toHaveAttribute('href', '/admin/courses')
  })

  it('does not throw when pathname matches a link href', () => {
    mockUsePathname.mockReturnValue('/admin/users')
    expect(() => renderWithProviders(<AdminNavbar links={links} />)).not.toThrow()
  })
})
