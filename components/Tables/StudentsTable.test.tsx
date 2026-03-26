import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudentsTable } from './StudentsTable'
import { renderWithProviders, makeStudent } from '@/test-utils'

vi.mock('mantine-datatable', () => ({
  DataTable: ({
    records,
    columns,
    fetching,
    noRecordsText,
    error,
  }: {
    records: Record<string, unknown>[]
    columns: { accessor: string; render?: (r: Record<string, unknown>) => React.ReactNode }[]
    fetching?: boolean
    noRecordsText?: string
    error?: string | null
  }) => {
    if (error) return <div data-testid="table-error">{error}</div>
    if (fetching) return <div data-testid="table-loading">Loading...</div>
    if (!records || records.length === 0)
      return <div data-testid="table-empty">{noRecordsText}</div>
    return (
      <table data-testid="data-table">
        <tbody>
          {records.map((record) => (
            <tr key={record.id as string} data-testid={`row-${record.id}`}>
              {columns.map((col) => (
                <td key={col.accessor} data-col={col.accessor}>
                  {col.render ? col.render(record) : String(record[col.accessor] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const visibleStudent = makeStudent({
  id: 'enrollment-1',
  username: 'jdoe',
  givenName: 'Jane',
  familyName: 'Doe',
  hidden: false,
  averageScore: 85,
})

const hiddenStudent = makeStudent({
  id: 'enrollment-2',
  username: 'asmith',
  givenName: 'Alice',
  familyName: 'Smith',
  hidden: true,
  averageScore: null,
})

describe('StudentsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders student username', () => {
    renderWithProviders(
      <StudentsTable students={[visibleStudent]} loading={false} error={null} />
    )
    expect(screen.getByText('jdoe')).toBeInTheDocument()
  })

  it('shows "Hidden" badge for a hidden student', () => {
    renderWithProviders(
      <StudentsTable students={[hiddenStudent]} loading={false} error={null} />
    )
    expect(screen.getByText('Hidden')).toBeInTheDocument()
  })

  it('shows score badge for a student with a score', () => {
    renderWithProviders(
      <StudentsTable students={[visibleStudent]} loading={false} error={null} />
    )
    expect(screen.getByText('85.0%')).toBeInTheDocument()
  })

  it('shows "No data" badge for student with null averageScore', () => {
    renderWithProviders(
      <StudentsTable students={[hiddenStudent]} loading={false} error={null} />
    )
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('calls onToggleHidden with (id, true) when Hide button clicked on visible student', async () => {
    const user = userEvent.setup()
    const onToggleHidden = vi.fn()
    renderWithProviders(
      <StudentsTable
        students={[visibleStudent]}
        loading={false}
        error={null}
        onToggleHidden={onToggleHidden}
      />
    )
    const hideButton = screen.getByRole('button', { name: /hide/i })
    await user.click(hideButton)
    expect(onToggleHidden).toHaveBeenCalledTimes(1)
    expect(onToggleHidden).toHaveBeenCalledWith('enrollment-1', true)
  })

  it('calls onToggleHidden with (id, false) when Unhide button clicked on hidden student', async () => {
    const user = userEvent.setup()
    const onToggleHidden = vi.fn()
    renderWithProviders(
      <StudentsTable
        students={[hiddenStudent]}
        loading={false}
        error={null}
        onToggleHidden={onToggleHidden}
      />
    )
    const unhideButton = screen.getByRole('button', { name: /unhide/i })
    await user.click(unhideButton)
    expect(onToggleHidden).toHaveBeenCalledTimes(1)
    expect(onToggleHidden).toHaveBeenCalledWith('enrollment-2', false)
  })

  it('shows loading state', () => {
    renderWithProviders(
      <StudentsTable students={[]} loading={true} error={null} />
    )
    expect(screen.getByTestId('table-loading')).toBeInTheDocument()
  })

  it('shows error message', () => {
    renderWithProviders(
      <StudentsTable students={[]} loading={false} error="Failed to load students" />
    )
    expect(screen.getByText(/Error:.*Failed to load students/i)).toBeInTheDocument()
  })

  it('shows "No students found" empty state', () => {
    renderWithProviders(
      <StudentsTable students={[]} loading={false} error={null} />
    )
    expect(screen.getByTestId('table-empty')).toHaveTextContent(
      'No students found for this course offering.'
    )
  })
})
