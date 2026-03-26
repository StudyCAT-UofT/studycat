import React from 'react'
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { server } from '@/mocks/server'
import { renderWithProviders, makeDefaultCourseValue } from '@/test-utils'

const mockUseCourse = vi.fn()
vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => mockUseCourse(),
}))

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}))

const { default: AddStudentsModal } = await import('./AddStudentsModal')

beforeAll(() => server.listen())
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe('AddStudentsModal', () => {
  beforeEach(() => {
    mockUseCourse.mockReturnValue(makeDefaultCourseValue())
  })

  it('shows modal title "Add Students"', () => {
    renderWithProviders(
      <AddStudentsModal
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(screen.getByText('Add Students')).toBeInTheDocument()
  })

  it('upload button "Upload & Add Students" is initially disabled', () => {
    renderWithProviders(
      <AddStudentsModal
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const uploadButton = screen.getByRole('button', {
      name: /Upload & Add Students/i,
    })
    expect(uploadButton).toBeDisabled()
  })

  it('shows "Expected CSV Format" information section', () => {
    renderWithProviders(
      <AddStudentsModal
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect(screen.getByText(/Expected CSV Format/i)).toBeInTheDocument()
  })

  it('shows valid format alert after uploading a valid CSV file', async () => {
    renderWithProviders(
      <AddStudentsModal
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement

    if (fileInput) {
      const csvContent = 'username\njdoe\njanedoe'
      const file = new File([csvContent], 'students.csv', { type: 'text/csv' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      // Trigger a change event so the component processes the file
      const changeEvent = new Event('change', { bubbles: true })
      fileInput.dispatchEvent(changeEvent)

      await waitFor(() => {
        expect(screen.getByText(/Valid Format/i)).toBeInTheDocument()
      })
    }
  })

  it('shows invalid format alert after uploading CSV without username column', async () => {
    renderWithProviders(
      <AddStudentsModal
        opened={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement

    if (fileInput) {
      const csvContent = 'email\ntest@example.com'
      const file = new File([csvContent], 'students.csv', { type: 'text/csv' })

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      })

      const changeEvent = new Event('change', { bubbles: true })
      fileInput.dispatchEvent(changeEvent)

      await waitFor(() => {
        expect(screen.getByText(/Invalid Format/i)).toBeInTheDocument()
      })
    }
  })
})
