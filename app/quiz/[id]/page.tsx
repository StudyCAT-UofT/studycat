'use client'

import { Container, Stack, Text, Title, Button, Group, Alert, Loader, Center } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute, QuizFeedback } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import QuizQuestion from '@/components/Quiz/QuizQuestion'
import { quizClient } from '@/lib/quiz-client'
import { QuizItem, Feedback, QuizResults, FeedbackData } from '@/types'

interface QuizState {
    attemptId: string
    currentItem?: QuizItem
    isFinished: boolean
    allMastered: boolean
    loading: boolean
    error?: string
    feedback?: Feedback | null
    nextItem?: QuizItem
    results?: QuizResults
    loadingResults: boolean
    showFeedback: boolean
    feedbackData?: FeedbackData
    loadingFeedback: boolean
}

const QuizContent = ({ quizId }: { quizId: string }) => {
    const { selectedCourseOffering } = useCourse()
    const { user } = useAuth()
    const router = useRouter()
    const [quizState, setQuizState] = useState<QuizState>({
        attemptId: '',
        isFinished: false,
        allMastered: false,
        loading: true,
        loadingResults: false,
        showFeedback: false,
        loadingFeedback: false
    })
    const [isInitialized, setIsInitialized] = useState(false)

    // Initialize quiz attempt
    useEffect(() => {
        // Prevent multiple initializations
        if (isInitialized) {
            return
        }

        const initQuiz = async () => {
            if (!selectedCourseOffering?.id) {
                console.error('No course offering selected')
                setQuizState(prev => ({ ...prev, error: 'No course offering selected', loading: false }))
                return
            }

            if (!user?.userId) {
                console.error('User not authenticated')
                setQuizState(prev => ({ ...prev, error: 'User not authenticated', loading: false }))
                return
            }

            try {
                setQuizState(prev => ({ ...prev, loading: true, error: undefined }))

                const response = await quizClient.initAttempt({
                    quizId,
                })

                setQuizState({
                    attemptId: response.attemptId,
                    currentItem: response.nextItem,
                    isFinished: false,
                    allMastered: false,
                    loading: false,
                    loadingResults: false,
                    showFeedback: false,
                    loadingFeedback: false
                })
                setIsInitialized(true) // Mark as initializing to prevent duplicate calls
            } catch (error) {
                console.error('Quiz initialization failed:', error)
                setQuizState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to start quiz',
                    loading: false
                }))
                setIsInitialized(false) // Reset on error to allow retry
            } finally {
                setIsInitialized(false) // Clear the initializing flag
            }
        }

        initQuiz()
    }, [quizId, selectedCourseOffering?.id, user?.userId, isInitialized])

    const handleAnswer = async (answerIndex: number) => {
        if (!quizState.attemptId || !quizState.currentItem) return

        try {
            const response = await quizClient.stepAttempt({
                attemptId: quizState.attemptId,
                itemId: quizState.currentItem.item_id,
                answerIndex,
            })

            setQuizState(prev => ({
                ...prev,
                feedback: response.feedback || null,
                nextItem: response.nextItem,
                isFinished: response.isFinished,
                allMastered: response.allMastered
            }))
        } catch (error) {
            setQuizState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to submit answer'
            }))
        }
    }

    const handleNext = async () => {
        if (quizState.isFinished || quizState.allMastered) {
            // Quiz is finished, show feedback screen
            await showFeedbackScreen()
        } else {
            // Move to next question
            setQuizState(prev => ({
                ...prev,
                currentItem: prev.nextItem,
                feedback: null,
                nextItem: undefined
            }))
        }
    }

    const showFeedbackScreen = async () => {
        setQuizState(prev => ({
            ...prev,
            loadingFeedback: true,
            feedback: null
        }))

        try {
            const feedbackData = await quizClient.getFeedback(quizState.attemptId)
            setQuizState(prev => ({
                ...prev,
                showFeedback: true,
                feedbackData,
                loadingFeedback: false
            }))
        } catch (error) {
            console.error('Failed to fetch quiz feedback:', error)
            setQuizState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to fetch quiz feedback',
                loadingFeedback: false
            }))
        }
    }

    const handleContinueQuiz = () => {
        // Reset to quiz mode, will fetch next question
        setQuizState(prev => ({
            ...prev,
            showFeedback: false,
            feedbackData: undefined,
            isFinished: false,
            loading: true
        }))

        // Re-initialize or continue the quiz by fetching the next item
        // Since the attempt is still IN_PROGRESS, we can continue
        // We'll need to manually fetch the next item
        fetchNextQuestion()
    }

    const fetchNextQuestion = async () => {
        try {
            // We need to get the next question from the FastAPI service
            // For now, we'll reload the page to restart the quiz flow
            // A more sophisticated approach would maintain state better
            window.location.reload()
        } catch (error) {
            console.error('Failed to continue quiz:', error)
            setQuizState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to continue quiz',
                loading: false
            }))
        }
    }

    const handleExit = async () => {
        // Show feedback screen instead of directly exiting
        await showFeedbackScreen()
    }

    const handleReturnToDashboard = () => {
        router.push('/')
    }

    if (quizState.loading) {
        return (
            <Container size="md" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Starting quiz...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    if (quizState.error) {
        return (
            <Container size="md" py="xl">
                <Alert title="Error" color="red">
                    {quizState.error}
                </Alert>
            </Container>
        )
    }

    // Show feedback screen
    if (quizState.showFeedback || quizState.allMastered) {
        if (quizState.loadingFeedback) {
            return (
                <Container size="md" py="xl">
                    <Center h={400}>
                        <Stack align="center" gap="md">
                            <Loader size="lg" />
                            <Text>Loading feedback...</Text>
                        </Stack>
                    </Center>
                </Container>
            )
        }

        if (quizState.feedbackData) {
            return (
                <QuizFeedback
                    feedbackData={quizState.feedbackData}
                    onContinue={handleContinueQuiz}
                    onReturnToDashboard={handleReturnToDashboard}
                    allMastered={quizState.allMastered}
                />
            )
        }
    }

    if (!quizState.currentItem) {
        return (
            <Container size="md" py="xl">
                <Alert title="Error" color="red">
                    No question available.
                </Alert>
            </Container>
        )
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Group justify="space-between">
                    <Title order={2}>Quiz</Title>
                    <Button variant="outline" onClick={handleExit}>
                        Exit Quiz
                    </Button>
                </Group>

                <QuizQuestion
                    item={quizState.currentItem}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    feedback={quizState.feedback}
                />
            </Stack>
        </Container>
    )
}

/**
 * Quiz page component
 */
export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
    const { selectedCourseOffering } = useCourse()
    const resolvedParams = use(params)

    // Validate quiz access for the current course offering
    if (!selectedCourseOffering) {
        return (
            <ProtectedRoute>
                <Container size="md" py="xl">
                    <Center h={400}>
                        <Stack align="center" gap="md">
                            <Loader size="lg" />
                            <Text>Loading course information...</Text>
                        </Stack>
                    </Center>
                </Container>
            </ProtectedRoute>
        )
    }

    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['STUDENT']
                }}
                unauthorizedMessage="Only students can take quizzes."
            >
                <QuizContent quizId={resolvedParams.id} />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
