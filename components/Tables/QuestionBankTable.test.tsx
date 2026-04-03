import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionBankTable } from './QuestionBankTable'
import { renderWithProviders, makeItem } from '@/test-utils'

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

vi.mock('@/components/Modals', () => ({
  EditQuestionModal: ({ opened, onSave }: { opened: boolean; onSave?: () => void }) =>
    opened ? (
      <div data-testid="edit-question-modal">
        <button onClick={onSave}>Save Modal</button>
      </div>
    ) : null,
}))

vi.mock('@/utils/getBloomColor', () => ({ getBloomColor: () => 'blue' }))

vi.mock('@/lib/course-context', () => ({
  CourseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useCourse: () => ({ selectedCourseOffering: { id: 'offering-1', course: { id: 'course-1' } } }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const activeItem = makeItem({
  id: 'item-1',
  externalQuestionId: 'Q001',
  active: true,
})

const inactiveItem = makeItem({
  id: 'item-2',
  externalQuestionId: 'Q002',
  active: false,
})

describe('QuestionBankTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item ID (externalQuestionId)', () => {
    renderWithProviders(
      <QuestionBankTable items={[activeItem]} loading={false} error={null} />
    )
    expect(screen.getByText('Q001')).toBeInTheDocument()
  })

  it('shows "Inactive" badge for inactive item', () => {
    renderWithProviders(
      <QuestionBankTable items={[inactiveItem]} loading={false} error={null} />
    )
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    renderWithProviders(
      <QuestionBankTable items={[]} loading={true} error={null} />
    )
    expect(screen.getByTestId('table-loading')).toBeInTheDocument()
  })

  it('shows error message in a card', () => {
    renderWithProviders(
      <QuestionBankTable items={[]} loading={false} error="Failed to fetch items" />
    )
    expect(screen.getByText(/Error:.*Failed to fetch items/i)).toBeInTheDocument()
  })

  it('clicking edit button opens EditQuestionModal', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <QuestionBankTable items={[activeItem]} loading={false} error={null} />
    )
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    expect(screen.getByTestId('edit-question-modal')).toBeInTheDocument()
  })

  it('calls onRefresh when edit modal Save is clicked', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    renderWithProviders(
      <QuestionBankTable items={[activeItem]} loading={false} error={null} onRefresh={onRefresh} />
    )
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)
    const saveButton = screen.getByRole('button', { name: /save modal/i })
    await user.click(saveButton)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
