import React, { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
    renderWithProviders,
    makeDefaultAuthValue,
    makeDefaultCourseValue,
    makeQuizItem,
    makeFeedbackData,
} from '@/test-utils'

// ─── Module-level mocks ──────────────────────────────────────────────────────

vi.mock('@/lib/quiz-client', () => ({
    quizClient: {
        initAttempt: vi.fn(),
        stepAttempt: vi.fn(),
        getFeedback: vi.fn(),
        getResults: vi.fn(),
    },
}))

vi.mock('@/lib/auth-context', () => ({
    useAuth: vi.fn(),
}))

vi.mock('@/lib/course-context', () => ({
    useCourse: vi.fn(),
}))

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}))

// Stub ProtectedRoute and RoleBasedRoute as transparent wrappers
vi.mock('@/components', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>()
    return {
        ...actual,
        ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        RoleBasedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        QuizFeedback: ({ onReturnToDashboard }: { onReturnToDashboard: () => void }) => (
            <div data-testid="quiz-feedback">
                <button onClick={onReturnToDashboard}>Return to Dashboard</button>
            </div>
        ),
    }
})

vi.mock('@/components/Quiz/QuizQuestion', () => ({
    default: ({
        onAnswer,
        onNext,
        item,
    }: {
        onAnswer: (i: number) => void
        onNext: () => void
        item: { stem: string }
    }) => (
        <div data-testid="quiz-question">
            <p data-testid="question-stem">{item?.stem}</p>
            <button onClick={() => onAnswer(0)}>Answer Option A</button>
            <button onClick={onNext}>Next Question</button>
        </div>
    ),
}))

// ─── Dynamic imports (after mocks) ──────────────────────────────────────────

const { quizClient } = await import('@/lib/quiz-client')
const { useAuth } = await import('@/lib/auth-context')
const { useCourse } = await import('@/lib/course-context')
const { useRouter } = await import('next/navigation')
const QuizPage = (await import('./page')).default

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockPush = vi.fn()

const mockQuizItem = makeQuizItem({
    item_id: 'item-1',
    stem: 'What is 2 + 2?',
})

const mockInitResponse = {
    attemptId: 'attempt-1',
    enrollmentId: 'enroll-1',
    quizId: 'quiz-1',
    theta: { 'mod-1': 0 },
    nextItem: mockQuizItem,
    nextAction: 'CONTINUE',
    shuffled: false,
    feedbackVisibility: 'full' as const,
    startedAt: new Date().toISOString(),
}

const mockStepResponse = {
    attemptId: 'attempt-1',
    theta: { 'mod-1': 0.5 },
    mastery: { 'mod-1': false },
    nextAction: 'CONTINUE',
    feedback: undefined,
    nextItem: makeQuizItem({ item_id: 'item-2', stem: 'What is 3 + 3?' }),
    isFinished: false,
    allMastered: false,
}

async function renderPage() {
    await act(async () => {
        renderWithProviders(
            <Suspense fallback={<div>Suspense loading...</div>}>
                <QuizPage params={Promise.resolve({ id: 'quiz-1' })} />
            </Suspense>
        )
    })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('app/quiz/[id]/page.tsx', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue(makeDefaultAuthValue())
        vi.mocked(useCourse).mockReturnValue(makeDefaultCourseValue())
        vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
    })

    // ── Loading / Init state ────────────────────────────────────────────────

    it('shows loading spinner while quiz is initializing', async () => {
        // Keep initAttempt pending so we can observe the loading state
        vi.mocked(quizClient.initAttempt).mockReturnValue(new Promise(() => {}))
        await renderPage()
        // React resolves `use(params)` suspension first; after that the loading state is shown
        expect(await screen.findByText('Starting quiz...')).toBeInTheDocument()
    })

    it('renders QuizQuestion after successful initialization', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        await renderPage()
        expect(await screen.findByTestId('quiz-question')).toBeInTheDocument()
        expect(screen.getByTestId('question-stem')).toHaveTextContent('What is 2 + 2?')
    })

    it('passes quizId to initAttempt', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        await renderPage()
        await screen.findByTestId('quiz-question')
        expect(vi.mocked(quizClient.initAttempt)).toHaveBeenCalledWith(
            expect.objectContaining({ quizId: 'quiz-1' })
        )
    })

    // ── Answer submission ───────────────────────────────────────────────────

    it('calls stepAttempt with correct args when an answer is submitted', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.stepAttempt).mockResolvedValue(mockStepResponse)
        await renderPage()
        await screen.findByTestId('quiz-question')

        await userEvent.click(screen.getByRole('button', { name: 'Answer Option A' }))

        await waitFor(() => {
            expect(vi.mocked(quizClient.stepAttempt)).toHaveBeenCalledWith({
                attemptId: 'attempt-1',
                itemId: 'item-1',
                answerIndex: 0,
            })
        })
    })

    it('advances to the next question after answering then clicking Next', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.stepAttempt).mockResolvedValue(mockStepResponse)
        await renderPage()
        await screen.findByTestId('quiz-question')

        await userEvent.click(screen.getByRole('button', { name: 'Answer Option A' }))
        await userEvent.click(screen.getByRole('button', { name: 'Next Question' }))

        await waitFor(() => {
            expect(screen.getByTestId('question-stem')).toHaveTextContent('What is 3 + 3?')
        })
    })

    // ── Feedback / completion ───────────────────────────────────────────────

    it('shows the feedback screen when isFinished is true', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.stepAttempt).mockResolvedValue({
            ...mockStepResponse,
            isFinished: true,
        })
        vi.mocked(quizClient.getFeedback).mockResolvedValue(makeFeedbackData())

        await renderPage()
        await screen.findByTestId('quiz-question')

        await userEvent.click(screen.getByRole('button', { name: 'Answer Option A' }))
        await userEvent.click(screen.getByRole('button', { name: 'Next Question' }))

        expect(await screen.findByTestId('quiz-feedback')).toBeInTheDocument()
    })

    it('shows the feedback screen when allMastered is true', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.stepAttempt).mockResolvedValue({
            ...mockStepResponse,
            allMastered: true,
        })
        vi.mocked(quizClient.getFeedback).mockResolvedValue(makeFeedbackData())

        await renderPage()
        await screen.findByTestId('quiz-question')

        await userEvent.click(screen.getByRole('button', { name: 'Answer Option A' }))
        await userEvent.click(screen.getByRole('button', { name: 'Next Question' }))

        expect(await screen.findByTestId('quiz-feedback')).toBeInTheDocument()
    })

    it('navigates to /quiz when Return to Dashboard is clicked', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.stepAttempt).mockResolvedValue({
            ...mockStepResponse,
            isFinished: true,
        })
        vi.mocked(quizClient.getFeedback).mockResolvedValue(makeFeedbackData())

        await renderPage()
        await screen.findByTestId('quiz-question')
        await userEvent.click(screen.getByRole('button', { name: 'Answer Option A' }))
        await userEvent.click(screen.getByRole('button', { name: 'Next Question' }))

        await screen.findByTestId('quiz-feedback')
        await userEvent.click(screen.getByRole('button', { name: 'Return to Dashboard' }))

        expect(mockPush).toHaveBeenCalledWith('/CSC494/quiz')
    })

    // ── Error handling ──────────────────────────────────────────────────────

    it('shows an error alert when initAttempt rejects', async () => {
        vi.mocked(quizClient.initAttempt).mockRejectedValue(new Error('Failed to start quiz'))
        await renderPage()

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
        expect(screen.getByText('Failed to start quiz')).toBeInTheDocument()
    })

    it('shows a generic error message when initAttempt rejects with non-Error', async () => {
        vi.mocked(quizClient.initAttempt).mockRejectedValue('network failure')
        await renderPage()

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
        })
        expect(screen.getByText('Failed to start quiz')).toBeInTheDocument()
    })

    // ── No course offering selected ─────────────────────────────────────────

    it('shows course loading spinner when no course offering is selected', async () => {
        vi.mocked(useCourse).mockReturnValue(
            makeDefaultCourseValue({ selectedCourseOffering: null })
        )
        await renderPage()
        expect(await screen.findByText('Loading course information...')).toBeInTheDocument()
    })

    // ── Exit button ─────────────────────────────────────────────────────────

    it('shows feedback screen when Exit Quiz is clicked', async () => {
        vi.mocked(quizClient.initAttempt).mockResolvedValue(mockInitResponse)
        vi.mocked(quizClient.getFeedback).mockResolvedValue(makeFeedbackData())

        await renderPage()
        await screen.findByTestId('quiz-question')

        await userEvent.click(screen.getByRole('button', { name: 'Exit Quiz' }))

        expect(await screen.findByTestId('quiz-feedback')).toBeInTheDocument()
    })
})
