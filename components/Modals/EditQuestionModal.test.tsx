import React from 'react'
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeDefaultCourseValue, makeItem } from '@/test-utils'

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}))

const { default: EditQuestionModal } = await import('./EditQuestionModal')

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe('EditQuestionModal', () => {
  beforeEach(() => {
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
  })

  it('shows "Create New Question" title in create mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={true}
        item={null}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Create New Question')).toBeInTheDocument()
    })
  })

  it('shows "Edit Question" title in edit mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={makeItem()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Question')).toBeInTheDocument()
    })
  })

  it('shows "Create Question" button in create mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={true}
        item={null}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Create Question/i })
      ).toBeInTheDocument()
    })
  })

  it('shows "Save Changes" button in edit mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={makeItem()}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save Changes/i })
      ).toBeInTheDocument()
    })
  })

  it('does NOT show active/inactive toggle in create mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={true}
        item={null}
        onSave={vi.fn()}
      />
    )

    // Wait for the modal to render fully
    await waitFor(() => {
      expect(screen.getByText('Create New Question')).toBeInTheDocument()
    })

    expect(screen.queryByText(/Active/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Inactive/i)).not.toBeInTheDocument()
  })

  it('shows active/inactive badge in edit mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={makeItem({ active: true })}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Active/i) || screen.getByText(/Inactive/i)
      ).toBeInTheDocument()
    })
  })

  it('renders null when not creating and item is null', () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={null}
        onSave={vi.fn()}
      />
    )

    // Component returns null — the modal content should not be present
    expect(screen.queryByText('Edit Question')).not.toBeInTheDocument()
    expect(screen.queryByText('Create New Question')).not.toBeInTheDocument()
  })

  // ─── Validation errors ───────────────────────────────────────────────────────

  it('shows error when stem is empty and save clicked in create mode', async () => {
    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={true}
        item={null}
        onSave={vi.fn()}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Create Question/i })).toBeInTheDocument()
    )

    // Fill required fields except stem
    fireEvent.change(screen.getByRole('textbox', { name: /Question ID/i }), {
      target: { value: 'Q001' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Question/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  // ─── Save flows (edit mode — item pre-fills the form) ────────────────────────

  it('calls PUT /api/items/:id in edit mode and shows success alert', async () => {
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.put('/api/items/:id', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'item-1' })
      })
    )

    const item = makeItem()

    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={item}
        onSave={vi.fn()}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/updated successfully/i)).toBeInTheDocument()
    })

    expect(capturedBody).toMatchObject({ stem: 'What is an array?' })
  })

  it('calls onSave callback after a successful PUT', async () => {
    const onSave = vi.fn()
    const item = makeItem()

    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={item}
        onSave={onSave}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error alert when PUT returns 500', async () => {
    server.use(
      http.put('/api/items/:id', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )

    const item = makeItem()

    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={item}
        onSave={vi.fn()}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  // ─── Active toggle (PATCH) ───────────────────────────────────────────────────

  it('calls PATCH /api/items/:id when Deactivate button is clicked', async () => {
    const { notifications } = await import('@mantine/notifications')
    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.patch('/api/items/:id', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'item-1' })
      })
    )

    const item = makeItem({ active: true })
    const onSave = vi.fn()

    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={false}
        item={item}
        onSave={onSave}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Deactivate/i })).toBeInTheDocument()
    )

    fireEvent.click(screen.getByRole('button', { name: /Deactivate/i }))

    await waitFor(() => {
      expect(capturedBody?.active).toBe(false)
    })
    expect(vi.mocked(notifications.show)).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'orange' })
    )
  })

  it('loads and displays module Select from GET /api/modules', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      )
    )

    renderWithProviders(
      <EditQuestionModal
        opened={true}
        onClose={vi.fn()}
        isCreating={true}
        item={null}
        onSave={vi.fn()}
      />
    )

    // The "Module" label should appear once modules endpoint is called
    await waitFor(() => {
      expect(screen.getByText('Module')).toBeInTheDocument()
    })
    // The placeholder text should also appear
    expect(screen.getByPlaceholderText('Select a module')).toBeInTheDocument()
  })
})
