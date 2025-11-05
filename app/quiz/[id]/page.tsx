'use client'

import { Container, Stack, Text, Title, Button, Group, Alert, Loader, Center, Paper } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import QuizQuestion from '@/components/Quiz/QuizQuestion'
import { quizClient } from '@/lib/quiz-client'
import { QuizItem } from '@/types'

interface Feedback {
    correctAnswerIndex: number
    selectedAnswerIndex: number
    isCorrect: boolean
    justification: string | null
}

interface QuizResults {
    attemptId: string
    totalQuestions: number
    correctAnswers: number
    percentage: number
}

interface QuizState {
    attemptId: string
    currentItem?: QuizItem
    isFinished: boolean
    loading: boolean
    error?: string
    feedback?: Feedback | null
    nextItem?: QuizItem
    results?: QuizResults
    loadingResults: boolean
}

const QuizContent = ({ quizId }: { quizId: string }) => {
    const { selectedCourseOffering } = useCourse()
    const { user } = useAuth()
    const router = useRouter()
    const [quizState, setQuizState] = useState<QuizState>({
        attemptId: '',
        isFinished: false,
        loading: true,
        loadingResults: false
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
                    loading: false,
                    loadingResults: false
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
                isFinished: response.isFinished
            }))
        } catch (error) {
            setQuizState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to submit answer'
            }))
        }
    }

    const handleNext = async () => {
        if (quizState.isFinished) {
            // Quiz is finished, fetch results and clear feedback
            setQuizState(prev => ({
                ...prev,
                feedback: null,
                loadingResults: true
            }))

            try {
                const results = await quizClient.getResults(quizState.attemptId)
                setQuizState(prev => ({
                    ...prev,
                    results: {
                        attemptId: results.attemptId,
                        totalQuestions: results.totalQuestions,
                        correctAnswers: results.correctAnswers,
                        percentage: results.percentage
                    },
                    loadingResults: false
                }))
            } catch (error) {
                console.error('Failed to fetch quiz results:', error)
                setQuizState(prev => ({
                    ...prev,
                    error: error instanceof Error ? error.message : 'Failed to fetch quiz results',
                    loadingResults: false
                }))
            }
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

    const handleExit = () => {
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

    // Show completion screen only if finished and no feedback is being shown
    if (quizState.isFinished && !quizState.feedback) {
        if (quizState.loadingResults) {
            return (
                <Container size="md" py="xl">
                    <Center h={400}>
                        <Stack align="center" gap="md">
                            <Loader size="lg" />
                            <Text>Loading results...</Text>
                        </Stack>
                    </Center>
                </Container>
            )
        }

        if (quizState.results) {
            return (
                <Container size="md" py="xl">
                    <Stack align="center" gap="lg">
                        <Title order={2}>Quiz Completed!</Title>

                        <Paper p="xl" radius="md" withBorder style={{ minWidth: 300 }}>
                            <Stack align="center" gap="md">
                                <Text size="xl" fw={700} c="blue">
                                    {quizState.results.percentage}%
                                </Text>
                                <Text size="lg">
                                    {quizState.results.correctAnswers} out of {quizState.results.totalQuestions} questions correct
                                </Text>
                            </Stack>
                        </Paper>

                        <Button onClick={handleExit}>Return to Dashboard</Button>
                    </Stack>
                </Container>
            )
        }

        return (
            <Container size="md" py="xl">
                <Stack align="center" gap="lg">
                    <Title order={2}>Quiz Completed!</Title>
                    <Button onClick={handleExit}>Return to Dashboard</Button>
                </Stack>
            </Container>
        )
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
