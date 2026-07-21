import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeItem, makeDefaultCourseValue } from '@/test-utils'
import QuestionBankPage from './page'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

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
  QuestionBankTable: ({
    items,
    onSelectedRecordsChange,
  }: {
    items: { id: string; externalQuestionId: string; active: boolean }[]
    onSelectedRecordsChange?: (records: unknown[]) => void
  }) => (
    <div data-testid="question-bank-table">
      {items.map(i => (
        <div key={i.id}>
          <span>{i.externalQuestionId}</span>
          {onSelectedRecordsChange && (
            <button onClick={() => onSelectedRecordsChange([i])}>
              Select {i.externalQuestionId}
            </button>
          )}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Modals', () => ({
  EditQuestionModal: ({
    opened,
    onClose,
  }: {
    opened: boolean
    onClose: () => void
  }) =>
    opened ? (
      <div data-testid="edit-question-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}))

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCourse.mockReturnValue(makeDefaultCourseValue())
})

describe('QuestionBankPage', () => {
  it('renders "Question Bank" heading', async () => {
    renderWithProviders(<QuestionBankPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /question bank/i })).toBeInTheDocument()
    })
  })

  it('shows search input labeled "Search Questions"', async () => {
    renderWithProviders(<QuestionBankPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('textbox', { name: /search questions/i })
      ).toBeInTheDocument()
    })
  })

  it('renders item external question IDs from API', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({
          items: [makeItem({ id: 'i-1', externalQuestionId: 'Q100' })],
          total: 1,
        })
      )
    )
    renderWithProviders(<QuestionBankPage />)
    await waitFor(() => {
      expect(screen.getByText('Q100')).toBeInTheDocument()
    })
  })

  it('"New Question" button is enabled when a course is selected', async () => {
    renderWithProviders(<QuestionBankPage />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /new question/i })
      expect(btn).not.toBeDisabled()
    })
  })

  it('"New Question" button opens modal when clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<QuestionBankPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /new question/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /new question/i }))

    await waitFor(() => {
      expect(screen.getByTestId('edit-question-modal')).toBeInTheDocument()
    })
  })

  // ─── Bulk action flows ────────────────────────────────────────────────────

  it('bulk deactivate calls PATCH /api/items with active: false', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({
          items: [makeItem({ id: 'i-1', externalQuestionId: 'Q100', active: true })],
          total: 1,
        })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch('/api/items', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ success: true, message: '1 item(s) updated' })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<QuestionBankPage />)

    await waitFor(() => expect(screen.getByText('Q100')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select Q100/i }))

    // "Deactivate (1)" button should appear for active items
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /deactivate/i }))

    await waitFor(() => {
      expect(capturedBody?.ids).toEqual(['i-1'])
      expect(capturedBody?.active).toBe(false)
    })
  })

  it('bulk reactivate calls PATCH /api/items with active: true', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({
          items: [makeItem({ id: 'i-1', externalQuestionId: 'Q100', active: false })],
          total: 1,
        })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch('/api/items', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ success: true, message: '1 item(s) updated' })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<QuestionBankPage />)

    await waitFor(() => expect(screen.getByText('Q100')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select Q100/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /reactivate/i }))

    await waitFor(() => {
      expect(capturedBody?.ids).toEqual(['i-1'])
      expect(capturedBody?.active).toBe(true)
    })
  })

  it('bulk delete calls DELETE /api/items after confirmation', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({
          items: [makeItem({ id: 'i-1', externalQuestionId: 'Q100', active: true })],
          total: 1,
        })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.delete('/api/items', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ success: true })
      })
    )

    const user = userEvent.setup()
    renderWithProviders(<QuestionBankPage />)

    await waitFor(() => expect(screen.getByText('Q100')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /select Q100/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /delete selected/i }))

    // Confirmation modal — click the "Delete" confirm button
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument()
    )
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(capturedBody?.ids).toEqual(['i-1'])
    })
  })

  it('search filter reduces displayed items client-side', async () => {
    server.use(
      http.get('/api/items', () =>
        HttpResponse.json({
          items: [
            makeItem({ id: 'i-1', externalQuestionId: 'ALPHA', stem: 'Alpha question' }),
            makeItem({ id: 'i-2', externalQuestionId: 'BETA', stem: 'Beta question' }),
          ],
          total: 2,
        })
      )
    )

    const user = userEvent.setup()
    renderWithProviders(<QuestionBankPage />)

    await waitFor(() => {
      expect(screen.getByText('ALPHA')).toBeInTheDocument()
      expect(screen.getByText('BETA')).toBeInTheDocument()
    })

    // Type in the search box
    const searchInput = screen.getByPlaceholderText(/search questions/i)
    await user.type(searchInput, 'ALPHA')

    // Only ALPHA should remain visible
    await waitFor(() => {
      expect(screen.getByText('ALPHA')).toBeInTheDocument()
      expect(screen.queryByText('BETA')).not.toBeInTheDocument()
    })
  })
})
