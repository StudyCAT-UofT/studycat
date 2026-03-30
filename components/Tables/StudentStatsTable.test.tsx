import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { StudentStatsTable } from './StudentStatsTable'
import { renderWithProviders, makeAttemptData } from '@/test-utils'

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

const highScoreAttempt = makeAttemptData({
  userId: 'user-1',
  username: 'jdoe',
  score: 85,
  startedAt: '2024-01-01T00:00:00.000Z',
})

const lowScoreAttempt = makeAttemptData({
  userId: 'user-2',
  username: 'asmith',
  score: 45,
  startedAt: '2024-01-02T00:00:00.000Z',
})

describe('StudentStatsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when attempts is empty', () => {
    renderWithProviders(
      <StudentStatsTable attempts={[]} />
    )
    expect(screen.queryByText('Student Performance Summary')).not.toBeInTheDocument()
    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
  })

  it('renders "Student Performance Summary" title when attempts exist', () => {
    renderWithProviders(
      <StudentStatsTable attempts={[highScoreAttempt]} />
    )
    expect(screen.getByText('Student Performance Summary')).toBeInTheDocument()
  })

  it('shows username in the table', () => {
    renderWithProviders(
      <StudentStatsTable attempts={[highScoreAttempt]} />
    )
    expect(screen.getByText('jdoe')).toBeInTheDocument()
  })

  it('shows green badge for score >= 80', () => {
    renderWithProviders(
      <StudentStatsTable attempts={[highScoreAttempt]} />
    )
    const badge = screen.getByText('85.0%')
    expect(badge).toBeInTheDocument()
    // Mantine Badge renders with a data-mantine-color or style containing the color
    const badgeRoot = badge.closest('.mantine-Badge-root')
    expect(badgeRoot?.getAttribute('style') ?? badgeRoot?.className ?? '').toMatch(/green/)
  })

  it('shows yellow badge for score >= 60 and < 80', () => {
    const midScoreAttempt = makeAttemptData({
      userId: 'user-3',
      username: 'bjones',
      score: 70,
      startedAt: '2024-01-03T00:00:00.000Z',
    })
    renderWithProviders(
      <StudentStatsTable attempts={[midScoreAttempt]} />
    )
    const badge = screen.getByText('70.0%')
    expect(badge).toBeInTheDocument()
    const badgeRoot = badge.closest('.mantine-Badge-root')
    expect(badgeRoot?.getAttribute('style') ?? badgeRoot?.className ?? '').toMatch(/yellow/)
  })

  it('shows red badge for score < 60', () => {
    renderWithProviders(
      <StudentStatsTable attempts={[lowScoreAttempt]} />
    )
    const badge = screen.getByText('45.0%')
    expect(badge).toBeInTheDocument()
    const badgeRoot = badge.closest('.mantine-Badge-root')
    expect(badgeRoot?.getAttribute('style') ?? badgeRoot?.className ?? '').toMatch(/red/)
  })
})
