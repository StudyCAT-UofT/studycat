import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { AttemptsOverTimeChart } from './AttemptsOverTimeChart'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@mantine/charts', () => ({
  BarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart" data-chart={JSON.stringify(data)} />
  ),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChartData(): { date: string; completed: number; incomplete: number }[] {
  const el = document.querySelector('[data-testid="bar-chart"]')
  if (!el) throw new Error('bar-chart not found')
  return JSON.parse(el.getAttribute('data-chart') ?? '[]')
}

describe('AttemptsOverTimeChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No data available" when attempts is empty array', () => {
    renderWithProviders(<AttemptsOverTimeChart attempts={[]} />)
    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
  })

  it('renders the bar chart when attempts are provided', () => {
    const today = new Date().toISOString()
    renderWithProviders(
      <AttemptsOverTimeChart attempts={[{ startedAt: today, status: 'COMPLETED' }]} />
    )
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('chart data has exactly 7 entries', () => {
    const today = new Date().toISOString()
    renderWithProviders(
      <AttemptsOverTimeChart attempts={[{ startedAt: today, status: 'COMPLETED' }]} />
    )
    const data = getChartData()
    expect(data).toHaveLength(7)
  })

  it('counts a COMPLETED attempt in the completed field for its day', () => {
    const today = new Date().toISOString()
    renderWithProviders(
      <AttemptsOverTimeChart attempts={[{ startedAt: today, status: 'COMPLETED' }]} />
    )
    const data = getChartData()
    const last = data[data.length - 1]
    expect(last.completed).toBe(1)
    expect(last.incomplete).toBe(0)
  })

  it('counts a non-COMPLETED attempt in the incomplete field for its day', () => {
    const today = new Date().toISOString()
    renderWithProviders(
      <AttemptsOverTimeChart attempts={[{ startedAt: today, status: 'IN_PROGRESS' }]} />
    )
    const data = getChartData()
    const last = data[data.length - 1]
    expect(last.completed).toBe(0)
    expect(last.incomplete).toBe(1)
  })
})
