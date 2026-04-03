import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { AdminShell } from './AdminShell'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

vi.mock('./AdminNavbar', () => ({
  AdminNavbar: ({ links }: { links: unknown[] }) => (
    <nav data-testid="admin-navbar">{links.length} links</nav>
  ),
}))

// Mock AppShell compound components
vi.mock('@mantine/core', async () => {
  const actual = await vi.importActual('@mantine/core')
  return {
    ...actual,
    AppShell: Object.assign(
      ({ children }: { children: React.ReactNode }) => (
        <div data-testid="app-shell">{children}</div>
      ),
      {
        ...(actual as Record<string, unknown>).AppShell as object,
        Navbar: ({ children }: { children: React.ReactNode }) => (
          <nav>{children}</nav>
        ),
        Main: ({ children }: { children: React.ReactNode }) => (
          <main>{children}</main>
        ),
      }
    ),
  }
})

// ─── Test data ────────────────────────────────────────────────────────────────

const links = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Courses', href: '/admin/courses' },
]

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children content', () => {
    renderWithProviders(
      <AdminShell links={links}>
        <div>Child Content</div>
      </AdminShell>
    )
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders the Navbar', () => {
    renderWithProviders(
      <AdminShell links={links}>
        <div>Content</div>
      </AdminShell>
    )
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('renders the AdminNavbar', () => {
    renderWithProviders(
      <AdminShell links={links}>
        <div>Content</div>
      </AdminShell>
    )
    expect(screen.getByTestId('admin-navbar')).toBeInTheDocument()
  })
})
