import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { ScoreDistributionChart } from './ScoreDistributionChart'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@mantine/charts', () => ({
  BarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="bar-chart" data-chart={JSON.stringify(data)} />
  ),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChartData(): { range: string; count: number }[] {
  const el = document.querySelector('[data-testid="bar-chart"]')
  if (!el) throw new Error('bar-chart not found')
  return JSON.parse(el.getAttribute('data-chart') ?? '[]')
}

describe('ScoreDistributionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No data available" when attempts is empty', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[]} />)
    expect(screen.getByText(/no data available/i)).toBeInTheDocument()
  })

  it('renders chart when attempts provided', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[{ score: 50 }]} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('chart data has exactly 11 entries (bins)', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[{ score: 50 }]} />)
    const data = getChartData()
    expect(data).toHaveLength(11)
  })

  it('score of 100 goes into the last bin labeled "100"', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[{ score: 100 }]} />)
    const data = getChartData()
    const lastBin = data[data.length - 1]
    expect(lastBin.range).toBe('100')
    expect(lastBin.count).toBe(1)
  })

  it('score of 0 goes into the first bin labeled "0-9"', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[{ score: 0 }]} />)
    const data = getChartData()
    const firstBin = data[0]
    expect(firstBin.range).toBe('0-9')
    expect(firstBin.count).toBe(1)
  })

  it('score of 85 goes into bin "80-89"', () => {
    renderWithProviders(<ScoreDistributionChart attempts={[{ score: 85 }]} />)
    const data = getChartData()
    const bin = data.find(d => d.range === '80-89')
    expect(bin).toBeDefined()
    expect(bin!.count).toBe(1)
  })
})
