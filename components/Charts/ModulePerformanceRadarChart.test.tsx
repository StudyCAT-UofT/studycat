import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, makeQuestionData } from '@/test-utils'
import { ModulePerformanceRadarChart } from './ModulePerformanceRadarChart'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('recharts', () => ({
  RadarChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="radar-chart" data-chart={JSON.stringify(data)} />
  ),
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Radar: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: () => null,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChartData(): { module: string; '% Correct': number }[] {
  const el = document.querySelector('[data-testid="radar-chart"]')
  if (!el) throw new Error('radar-chart not found')
  return JSON.parse(el.getAttribute('data-chart') ?? '[]')
}

describe('ModulePerformanceRadarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No module data available" when questions is empty', () => {
    renderWithProviders(<ModulePerformanceRadarChart questions={[]} />)
    expect(screen.getByText(/no module data available/i)).toBeInTheDocument()
  })

  it('renders the radar chart when data provided', () => {
    const questions = [makeQuestionData({ moduleName: 'Arrays', average: 0.7 })]
    renderWithProviders(<ModulePerformanceRadarChart questions={questions} />)
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('groups 2 questions with the same moduleName into 1 entry', () => {
    const questions = [
      makeQuestionData({ moduleName: 'Arrays', average: 0.6 }),
      makeQuestionData({ moduleName: 'Arrays', average: 0.8 }),
    ]
    renderWithProviders(<ModulePerformanceRadarChart questions={questions} />)
    const data = getChartData()
    const arrayEntries = data.filter(d => d.module === 'Arrays')
    expect(arrayEntries).toHaveLength(1)
  })

  it('groups questions with null moduleName as "Unassigned"', () => {
    const questions = [makeQuestionData({ moduleName: null, average: 0.5 })]
    renderWithProviders(<ModulePerformanceRadarChart questions={questions} />)
    const data = getChartData()
    const unassigned = data.find(d => d.module === 'Unassigned')
    expect(unassigned).toBeDefined()
  })

  it('computes average correctly for 2 questions with average 0.6 and 0.8', () => {
    const questions = [
      makeQuestionData({ moduleName: 'Arrays', average: 0.6 }),
      makeQuestionData({ moduleName: 'Arrays', average: 0.8 }),
    ]
    renderWithProviders(<ModulePerformanceRadarChart questions={questions} />)
    const data = getChartData()
    const entry = data.find(d => d.module === 'Arrays')
    expect(entry).toBeDefined()
    expect(entry!['% Correct']).toBeCloseTo(70.0, 1)
  })
})
