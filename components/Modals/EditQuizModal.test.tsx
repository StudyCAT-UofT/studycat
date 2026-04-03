import React from 'react'
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { renderWithProviders, makeDefaultCourseValue, makeQuiz } from '@/test-utils'

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}))

const { default: EditQuizModal } = await import('./EditQuizModal')

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe('EditQuizModal', () => {
  beforeEach(() => {
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
  })

  it('shows "Create New Quiz" title in create mode', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={null}
        isCreating={true}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Create New Quiz')).toBeInTheDocument()
    })
  })

  it('shows "Edit Quiz" title in edit mode', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={makeQuiz({ title: 'My Quiz' })}
        isCreating={false}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Edit Quiz')).toBeInTheDocument()
    })
  })

  it('shows "Create Quiz" save button in create mode', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={null}
        isCreating={true}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Create Quiz/i })
      ).toBeInTheDocument()
    })
  })

  it('shows "Save Changes" save button in edit mode', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={makeQuiz({ title: 'My Quiz' })}
        isCreating={false}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save Changes/i })
      ).toBeInTheDocument()
    })
  })

  it('pre-fills title input in edit mode', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={makeQuiz({ title: 'My Quiz' })}
        isCreating={false}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('My Quiz')
      expect(titleInput).toBeInTheDocument()
    })
  })

  it('shows error alert when title is empty and save clicked', async () => {
    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={null}
        isCreating={true}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Create Quiz/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Create Quiz/i }))

    await waitFor(() => {
      expect(screen.getByText('Quiz title is required')).toBeInTheDocument()
    })
  })

  it('shows error when no modules selected and save clicked', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({
          modules: [{ id: 'module-1', name: 'Arrays' }],
        })
      )
    )

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={null}
        isCreating={true}
        onSave={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Create Quiz/i })
      ).toBeInTheDocument()
    })

    // Fill in the title so title validation passes
    const titleInput = screen.getByRole('textbox', { name: /quiz title/i })
    fireEvent.change(titleInput, { target: { value: 'Valid Title' } })

    fireEvent.click(screen.getByRole('button', { name: /Create Quiz/i }))

    await waitFor(() => {
      // Some error message should appear (about modules or other validation)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  // ─── Save flows ─────────────────────────────────────────────────────────────

  it('calls PUT /api/quizzes/:id in edit mode when modules are pre-loaded from quizModules', async () => {
    // Set up module data to return from /api/modules
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      )
    )

    let capturedBody: Record<string, unknown> | null = null
    server.use(
      http.put('/api/quizzes/:id', async ({ request }) => {
        capturedBody = await request.json() as Record<string, unknown>
        return HttpResponse.json({ id: 'quiz-1', title: 'My Quiz' })
      })
    )

    // Build a quiz whose quizModules will auto-populate the module selection
    const quiz = makeQuiz({
      id: 'quiz-1',
      title: 'My Quiz',
      quizModules: [{ quizId: 'quiz-1', moduleId: 'module-1', masteryThreshold: 1.0 }],
    })

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={quiz}
        isCreating={false}
        onSave={vi.fn()}
      />
    )

    // Wait for modules to load and form to auto-populate
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument()
    })

    // Modules are auto-selected via the quizModules effect; click save
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(capturedBody).not.toBeNull()
      expect(capturedBody?.title).toBe('My Quiz')
      expect(capturedBody?.includedModuleIds).toEqual(['module-1'])
    })
  })

  it('shows success alert after a successful PUT save', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      )
    )

    const quiz = makeQuiz({
      id: 'quiz-1',
      title: 'My Quiz',
      quizModules: [{ quizId: 'quiz-1', moduleId: 'module-1', masteryThreshold: 1.0 }],
    })

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={quiz}
        isCreating={false}
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
  })

  it('calls onSave callback after a successful save', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      )
    )

    const onSave = vi.fn()
    const quiz = makeQuiz({
      id: 'quiz-1',
      title: 'My Quiz',
      quizModules: [{ quizId: 'quiz-1', moduleId: 'module-1', masteryThreshold: 1.0 }],
    })

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={quiz}
        isCreating={false}
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

  it('shows error alert when API returns 500', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      ),
      http.put('/api/quizzes/:id', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 })
      )
    )

    const quiz = makeQuiz({
      id: 'quiz-1',
      title: 'My Quiz',
      quizModules: [{ quizId: 'quiz-1', moduleId: 'module-1', masteryThreshold: 1.0 }],
    })

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={quiz}
        isCreating={false}
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

  it('shows mastery threshold inputs when a module is selected via quizModules', async () => {
    server.use(
      http.get('/api/modules', () =>
        HttpResponse.json({ modules: [{ id: 'module-1', name: 'Arrays' }] })
      )
    )

    const quiz = makeQuiz({
      id: 'quiz-1',
      title: 'My Quiz',
      quizModules: [{ quizId: 'quiz-1', moduleId: 'module-1', masteryThreshold: 1.0 }],
    })

    renderWithProviders(
      <EditQuizModal
        opened={true}
        onClose={vi.fn()}
        quiz={quiz}
        isCreating={false}
        onSave={vi.fn()}
      />
    )

    // Once modules load, the threshold section should appear with the module name label
    await waitFor(() => {
      expect(screen.getByText('Mastery Thresholds')).toBeInTheDocument()
    })
    // A NumberInput labelled with the module name should appear
    expect(screen.getByRole('textbox', { name: 'Arrays' })).toBeInTheDocument()
  })
})
