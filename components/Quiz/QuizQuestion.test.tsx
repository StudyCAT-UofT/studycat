import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizQuestion from './QuizQuestion'
import { renderWithProviders, makeQuizItem, makeFeedback } from '@/test-utils'
import { feedbackLevels } from '@/types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultItem = makeQuizItem({
  item_id: 'q1',
  stem: 'What is 2 + 2?',
  options: ['1', '2', '4', '8'],
})

describe('QuizQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders the question stem', () => {
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={null}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    // The stem appears as a visible heading (also hidden in Radio.Group label)
    expect(screen.getByRole('heading', { name: 'What is 2 + 2?' })).toBeInTheDocument()
  })

  it('renders all answer options', () => {
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={null}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  // ─── Submit button state ──────────────────────────────────────────────────

  it('disables the Submit Answer button when no option is selected', () => {
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={null}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.getByRole('button', { name: /Submit Answer/i })).toBeDisabled()
  })

  it('enables the Submit Answer button after an option is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={null}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )

    const option = screen.getByLabelText('4')
    await user.click(option)

    expect(screen.getByRole('button', { name: /Submit Answer/i })).not.toBeDisabled()
  })

  it('calls onAnswer with the correct original index when Submit is clicked', async () => {
    const user = userEvent.setup()
    const onAnswer = vi.fn()
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={onAnswer}
        feedback={null}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )

    // Click the 3rd option (index 2 in the options array = '4')
    const option = screen.getByLabelText('4')
    await user.click(option)
    await user.click(screen.getByRole('button', { name: /Submit Answer/i }))

    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(onAnswer).toHaveBeenCalledWith(2) // '4' is at index 2
  })

  // ─── Feedback mode ────────────────────────────────────────────────────────

  it('shows the Next button (not Submit) in feedback mode', () => {
    const feedback = makeFeedback({ correctAnswerIndex: 0, selectedAnswerIndex: 0, isCorrect: true })
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        onNext={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Submit Answer/i })).not.toBeInTheDocument()
  })

  it('calls onNext when the Next button is clicked', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    const feedback = makeFeedback()
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        onNext={onNext}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )

    await user.click(screen.getByRole('button', { name: /Next/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows justification text when feedbackVisibility is full', () => {
    const feedback = makeFeedback({ justification: 'Because 2 + 2 equals 4.' })
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.getByText('Because 2 + 2 equals 4.')).toBeInTheDocument()
  })

  it('shows "Response recorded" message when feedbackVisibility is none', () => {
    const feedback = makeFeedback()
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.NONE}
      />
    )
    expect(screen.getByText('Response recorded.')).toBeInTheDocument()
  })

  it('does not show justification when feedbackVisibility is no-just', () => {
    const feedback = makeFeedback({ justification: 'Hidden justification.' })
    renderWithProviders(
      <QuizQuestion
        item={defaultItem}
        onAnswer={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.NO_JUST}
      />
    )
    expect(screen.queryByText('Hidden justification.')).not.toBeInTheDocument()
    expect(screen.getByText('Response recorded.')).toBeInTheDocument()
  })

  // ─── Optional fields ──────────────────────────────────────────────────────

  it('renders a reference when provided', () => {
    const feedback = makeFeedback()
    const item = makeQuizItem({ reference: 'Lecture 3, Slide 12' })
    renderWithProviders(
      <QuizQuestion
        item={item}
        onAnswer={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.getByText('Lecture 3, Slide 12')).toBeInTheDocument()
  })

  it('does not render a reference section when reference is null', () => {
    const feedback = makeFeedback()
    const item = makeQuizItem({ reference: null })
    renderWithProviders(
      <QuizQuestion
        item={item}
        onAnswer={vi.fn()}
        feedback={feedback}
        shuffled={false}
        feedbackVisibility={feedbackLevels.FULL}
      />
    )
    expect(screen.queryByText('Reference:')).not.toBeInTheDocument()
  })
})
