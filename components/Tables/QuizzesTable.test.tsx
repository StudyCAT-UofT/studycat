import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuizzesTable } from './QuizzesTable'
import { renderWithProviders, makeQuiz } from '@/test-utils'

// Mock mantine-datatable: the DataTable component depends heavily on browser
// layout APIs (ResizeObserver, scroll containers) that are not available in jsdom.
// A thin mock lets us focus on the QuizzesTable's own logic.
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

const activeQuiz = makeQuiz({ id: 'q-1', title: 'Active Quiz', isActive: true })
const inactiveQuiz = makeQuiz({
  id: 'q-2',
  title: 'Inactive Quiz',
  isActive: false,
})

describe('QuizzesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders quiz titles', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[activeQuiz, inactiveQuiz]} loading={false} error={null} />
    )
    expect(screen.getByText('Active Quiz')).toBeInTheDocument()
    expect(screen.getByText('Inactive Quiz')).toBeInTheDocument()
  })

  it('shows Active badge for an active quiz', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[activeQuiz]} loading={false} error={null} />
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows Inactive badge for an inactive quiz', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[inactiveQuiz]} loading={false} error={null} />
    )
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('renders quiz fixedLength (question count)', () => {
    const quiz = makeQuiz({ id: 'q-3', fixedLength: 15 })
    renderWithProviders(
      <QuizzesTable quizzes={[quiz]} loading={false} error={null} />
    )
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('shows stats when quiz has attempts', () => {
    const quiz = makeQuiz({
      id: 'q-4',
      stats: { totalAttempts: 42, averageScore: 75.5, completionRate: 90.0 },
    })
    renderWithProviders(
      <QuizzesTable quizzes={[quiz]} loading={false} error={null} />
    )
    expect(screen.getByText('Attempts: 42')).toBeInTheDocument()
    expect(screen.getByText('Avg: 75.5%')).toBeInTheDocument()
  })

  it('shows "No attempts yet" when quiz has no attempts', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[activeQuiz]} loading={false} error={null} />
    )
    expect(screen.getByText('No attempts yet')).toBeInTheDocument()
  })

  // ─── Empty / loading / error states ──────────────────────────────────────

  it('shows "No quizzes found" when the list is empty', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[]} loading={false} error={null} />
    )
    expect(screen.getByTestId('table-empty')).toHaveTextContent(
      'No quizzes found for this course.'
    )
  })

  it('shows a loading indicator while fetching', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[]} loading={true} error={null} />
    )
    expect(screen.getByTestId('table-loading')).toBeInTheDocument()
  })

  it('shows error message when error is provided', () => {
    renderWithProviders(
      <QuizzesTable quizzes={[]} loading={false} error="Failed to load quizzes" />
    )
    expect(screen.getByText(/Failed to load quizzes/i)).toBeInTheDocument()
  })

  // ─── Interactions ─────────────────────────────────────────────────────────

  it('calls onEditQuiz with the correct quiz when the edit icon is clicked', async () => {
    const user = userEvent.setup()
    const onEditQuiz = vi.fn()
    renderWithProviders(
      <QuizzesTable
        quizzes={[activeQuiz]}
        loading={false}
        error={null}
        onEditQuiz={onEditQuiz}
      />
    )

    // The edit action icon is rendered inside the 'actions' column
    const editButton = screen.getByRole('button')
    await user.click(editButton)
    expect(onEditQuiz).toHaveBeenCalledTimes(1)
    expect(onEditQuiz).toHaveBeenCalledWith(activeQuiz)
  })
})
