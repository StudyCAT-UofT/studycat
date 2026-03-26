import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizFeedback from './QuizFeedback'
import { renderWithProviders, makeFeedbackData } from '@/test-utils'
import { feedbackLevels, type DetailedQuestionReview } from '@/types'

// ─── Per-question review factory ──────────────────────────────────────────────

const makeQuestionReview = (overrides: Partial<DetailedQuestionReview> = {}): DetailedQuestionReview => ({
    questionNumber: 1,
    itemId: 'item-1',
    moduleId: 'mod-1',
    moduleName: 'Module 1',
    bloomLevel: 'REMEMBER',
    stem: 'What is 2+2?',
    figureUrl: null,
    reference: null,
    selectedAnswerIndex: 0,
    correctAnswerIndex: 0,
    isCorrect: true,
    options: [
        { label: 'A', text: '4', justification: 'Because basic arithmetic.', isCorrect: true },
        { label: 'B', text: '3', justification: null, isCorrect: false },
        { label: 'C', text: '5', justification: null, isCorrect: false },
        { label: 'D', text: '22', justification: null, isCorrect: false },
    ],
    answeredAt: '2024-01-01T00:01:00.000Z',
    responseTimeMs: 1500,
    ...overrides,
})

// Mock the CompositeChart from @mantine/charts — chart rendering is not relevant
// in unit tests and relies on browser canvas APIs not available in jsdom.
vi.mock('@mantine/charts', () => ({
  CompositeChart: () => <div data-testid="composite-chart" />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseFeedbackData = makeFeedbackData({
  quizTitle: 'Midterm Practice',
  percentage: 70,
  questionsCorrect: 7,
  questionsAttempted: 10,
  fixedLength: 10,
  totalTimeMs: 90_000, // 1m 30s
  canContinue: false,
  continueReason: null,
})

describe('QuizFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders the page title', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByText('Quiz Feedback')).toBeInTheDocument()
  })

  it('renders the quiz title', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByText('Midterm Practice')).toBeInTheDocument()
  })

  it('displays the score percentage', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('displays correct / attempted questions', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByText('7 / 10 correct')).toBeInTheDocument()
  })

  it('displays formatted time spent', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByText('1m 30s')).toBeInTheDocument()
  })

  // ─── Action buttons ───────────────────────────────────────────────────────

  it('always shows the Return to Dashboard button', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(
      screen.getByRole('button', { name: /Return to Dashboard/i })
    ).toBeInTheDocument()
  })

  it('shows Continue Quiz button when canContinue is true', () => {
    const feedbackData = makeFeedbackData({ canContinue: true, continueReason: 'in_progress' })
    renderWithProviders(
      <QuizFeedback
        feedbackData={feedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByRole('button', { name: /Continue Quiz/i })).toBeInTheDocument()
  })

  it('hides Continue Quiz button when canContinue is false', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.queryByRole('button', { name: /Continue Quiz/i })).not.toBeInTheDocument()
  })

  it('calls onContinue when Continue Quiz button is clicked', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    const feedbackData = makeFeedbackData({ canContinue: true, continueReason: 'in_progress' })
    renderWithProviders(
      <QuizFeedback
        feedbackData={feedbackData}
        onContinue={onContinue}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /Continue Quiz/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('calls onReturnToDashboard when Return to Dashboard is clicked', async () => {
    const user = userEvent.setup()
    const onReturnToDashboard = vi.fn()
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={onReturnToDashboard}
        allMastered={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /Return to Dashboard/i }))
    expect(onReturnToDashboard).toHaveBeenCalledTimes(1)
  })

  // ─── Mastery ──────────────────────────────────────────────────────────────

  it('shows mastery congratulations alert when allMastered is true', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={true}
      />
    )
    expect(
      screen.getByText(/Congratulations! You've Mastered All Modules!/i)
    ).toBeInTheDocument()
  })

  it('does not show mastery alert when allMastered is false', () => {
    renderWithProviders(
      <QuizFeedback
        feedbackData={baseFeedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(
      screen.queryByText(/Congratulations! You've Mastered All Modules!/i)
    ).not.toBeInTheDocument()
  })

  // ─── Feedback visibility ──────────────────────────────────────────────────

  it('shows "Detailed feedback is not available" message when feedbackVisibility is none', () => {
    const feedbackData = makeFeedbackData({ feedbackVisibility: feedbackLevels.NONE })
    renderWithProviders(
      <QuizFeedback
        feedbackData={feedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(
      screen.getByText(/Detailed feedback is not available for this quiz/i)
    ).toBeInTheDocument()
  })

  // ─── Module performance chart ─────────────────────────────────────────────

  it('renders the composite chart when module performance data is present', () => {
    const feedbackData = makeFeedbackData({
      modulePerformance: [
        {
          moduleId: 'm-1',
          moduleName: 'Arrays',
          theta: 0.5,
          threshold: 0.0,
          performanceLevel: 'Proficient',
          performanceValue: 75,
          questionsAttempted: 5,
          questionsCorrect: 4,
        },
      ],
    })
    renderWithProviders(
      <QuizFeedback
        feedbackData={feedbackData}
        onContinue={vi.fn()}
        onReturnToDashboard={vi.fn()}
        allMastered={false}
      />
    )
    expect(screen.getByTestId('composite-chart')).toBeInTheDocument()
  })

  // ─── Per-question review (lines 332–436) ──────────────────────────────────

  describe('per-question review accordion', () => {
    const questionReview = makeQuestionReview()

    it('shows "Question-by-Question Review" heading when visibility is FULL and questions exist', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.getByText('Question-by-Question Review')).toBeInTheDocument()
    })

    it('shows "Question-by-Question Review" heading when visibility is NO_JUST and questions exist', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.NO_JUST,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.getByText('Question-by-Question Review')).toBeInTheDocument()
    })

    it('renders module and Bloom badges in the accordion header', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.getByText('Module 1')).toBeInTheDocument()
      expect(screen.getByText('REMEMBER')).toBeInTheDocument()
    })

    it('shows option texts and stem after expanding an accordion item', async () => {
      const user = userEvent.setup()
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )

      // Click the accordion control to expand
      await user.click(screen.getByText('Question 1'))

      expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows justification text when feedbackVisibility is FULL', async () => {
      const user = userEvent.setup()
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )

      await user.click(screen.getByText('Question 1'))
      expect(screen.getByText('Because basic arithmetic.')).toBeInTheDocument()
    })

    it('hides justification text when feedbackVisibility is NO_JUST', async () => {
      const user = userEvent.setup()
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.NO_JUST,
        questions: [questionReview],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )

      await user.click(screen.getByText('Question 1'))
      expect(screen.queryByText('Because basic arithmetic.')).not.toBeInTheDocument()
    })

    it('does not render the accordion when questions array is empty (FULL)', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.queryByText('Question-by-Question Review')).not.toBeInTheDocument()
    })

    it('shows Correct badge for a correctly answered question', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [makeQuestionReview({ isCorrect: true })],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.getByText('Correct')).toBeInTheDocument()
    })

    it('shows Incorrect badge for a wrong answer', () => {
      const feedbackData = makeFeedbackData({
        feedbackVisibility: feedbackLevels.FULL,
        questions: [makeQuestionReview({ isCorrect: false, selectedAnswerIndex: 1 })],
      })
      renderWithProviders(
        <QuizFeedback
          feedbackData={feedbackData}
          onContinue={vi.fn()}
          onReturnToDashboard={vi.fn()}
          allMastered={false}
        />
      )
      expect(screen.getByText('Incorrect')).toBeInTheDocument()
    })
  })
})
