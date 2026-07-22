import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeStudent, makeDefaultCourseValue } from '@/test-utils'
import StudentsPage from './page'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/components', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoleBasedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@/components/Tables', () => ({
  StudentsTable: ({
    students,
    onSelectedRecordsChange,
  }: {
    students: { id: string; username: string; hidden: boolean }[]
    onSelectedRecordsChange: (records: unknown[]) => void
  }) => (
    <div data-testid="students-table">
      {students.map(s => (
        <div key={s.id}>
          <span>{s.username}</span>
          <button onClick={() => onSelectedRecordsChange([s])}>
            Select {s.username}
          </button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Modals', () => ({
  AddStudentsModal: ({
    opened,
    onClose,
  }: {
    opened: boolean
    onClose: () => void
  }) =>
    opened ? (
      <div data-testid="add-students-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCourse.mockReturnValue(makeDefaultCourseValue())
})

describe('StudentsPage', () => {
  it('renders "Students" heading', async () => {
    renderWithProviders(<StudentsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /students/i })).toBeInTheDocument()
    })
  })

  it('renders student usernames from API', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe' })],
        })
      )
    )
    renderWithProviders(<StudentsPage />)
    await waitFor(() => {
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })
  })

  it('"Add Students" button opens modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add students/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /add students/i }))

    await waitFor(() => {
      expect(screen.getByTestId('add-students-modal')).toBeInTheDocument()
    })
  })

  it('"Hide Selected" button appears when visible student is selected', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe', hidden: false })],
        })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select johndoe/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /hide selected/i })).toBeInTheDocument()
    })
  })

  it('"Delete Selected" button appears when student is selected', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe' })],
        })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => {
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /select johndoe/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
    })
  })

  // ─── Bulk action flows ────────────────────────────────────────────────────

  it('bulk hide calls PATCH /api/enrollments with correct body', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe', hidden: false })],
        })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch('/api/enrollments', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ success: true })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select johndoe/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /hide selected/i })).toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: /hide selected/i }))

    // Confirmation modal appears — click "Hide" to confirm
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^hide$/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /^hide$/i }))

    await waitFor(() => {
      expect(capturedBody?.enrollmentIds).toEqual(['s-1'])
      expect(capturedBody?.hidden).toBe(true)
    })
  })

  it('bulk delete calls DELETE /api/enrollments with correct body', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe' })],
        })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.delete('/api/enrollments', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ success: true })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select johndoe/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: /delete selected/i }))

    // Confirmation modal appears — click "Remove" to confirm
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => {
      expect(capturedBody?.enrollmentIds).toEqual(['s-1'])
    })
  })

  it('shows hidden student count in the badge', async () => {
    server.use(
      http.get('/api/students', () =>
        HttpResponse.json({
          students: [
            makeStudent({ id: 's-1', username: 'johndoe', hidden: false }),
            makeStudent({ id: 's-2', username: 'janedoe', hidden: true }),
          ],
        })
      )
    )
    renderWithProviders(<StudentsPage />)

    await waitFor(() => {
      // The badge shows "1 student (1 hidden)"
      expect(screen.getByText(/1 hidden/i)).toBeInTheDocument()
    })
  })

  it('re-fetches students after a successful hide', async () => {
    let fetchCount = 0
    server.use(
      http.get('/api/students', () => {
        fetchCount++
        return HttpResponse.json({
          students: [makeStudent({ id: 's-1', username: 'johndoe', hidden: false })],
        })
      }),
      http.patch('/api/enrollments', () => HttpResponse.json({ success: true }))
    )

    const user = userEvent.setup()
    renderWithProviders(<StudentsPage />)

    await waitFor(() => expect(screen.getByText('johndoe')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select johndoe/i }))
    await user.click(screen.getByRole('button', { name: /hide selected/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^hide$/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /^hide$/i }))

    await waitFor(() => {
      // Initial fetch + re-fetch after hide = at least 2 calls
      expect(fetchCount).toBeGreaterThanOrEqual(2)
    })
  })
})
