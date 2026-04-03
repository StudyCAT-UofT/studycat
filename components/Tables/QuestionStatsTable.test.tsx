import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { QuestionStatsTable } from './QuestionStatsTable'
import { renderWithProviders, makeQuestionData } from '@/test-utils'

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
          {records.map((record, index) => (
            <tr key={String(record.id ?? record.itemId ?? index)} data-testid={`row-${record.id ?? record.itemId ?? index}`}>
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

const question1 = makeQuestionData({
  questionId: 'Q001',
  itemId: 'item-1',
  stem: 'What is an array?',
})

const question2 = makeQuestionData({
  questionId: 'Q002',
  itemId: 'item-2',
  stem: 'What is a loop?',
})

describe('QuestionStatsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Question-Level Statistics" title', () => {
    renderWithProviders(
      <QuestionStatsTable questions={[question1]} selectedQuizId="quiz-1" />
    )
    expect(screen.getByText('Question-Level Statistics')).toBeInTheDocument()
  })

  it('shows badge with question count "2 questions"', () => {
    renderWithProviders(
      <QuestionStatsTable questions={[question1, question2]} selectedQuizId="quiz-1" />
    )
    expect(screen.getByText('2 questions')).toBeInTheDocument()
  })

  it('shows "1 question" (singular) when 1 question', () => {
    renderWithProviders(
      <QuestionStatsTable questions={[question1]} selectedQuizId="quiz-1" />
    )
    expect(screen.getByText('1 question')).toBeInTheDocument()
  })

  it('renders the data table when questions are provided', () => {
    renderWithProviders(
      <QuestionStatsTable questions={[question1]} selectedQuizId="quiz-1" />
    )
    expect(screen.getByTestId('data-table')).toBeInTheDocument()
  })

  it('shows "0 questions" badge when empty', () => {
    renderWithProviders(
      <QuestionStatsTable questions={[]} selectedQuizId="quiz-1" />
    )
    expect(screen.getByText('0 questions')).toBeInTheDocument()
  })
})
