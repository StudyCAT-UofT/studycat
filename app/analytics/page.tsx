'use client'

import { Container, Stack, Title, Select, Card, SimpleGrid, Text, Group, Loader, Center, Alert } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { ScoreDistributionChart, AttemptsOverTimeChart } from '@/components/Charts'
import { QuestionStatsTable, StudentStatsTable, QuestionData } from '@/components/Analytics'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Quiz } from '@/types'

interface AttemptData {
    userId: string
    username: string
    score: number
    questions: Array<{
        questionId: string
        stem: string
        isCorrect: boolean
    }>
    startedAt: string
}

interface AnalyticsData {
    attempts: AttemptData[]
    questions: QuestionData[]
    totalStudents: number
}

/**
 * Main content component for the analytics page
 * Displays comprehensive quiz analytics with charts and metrics
 */
const AnalyticsContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Fetches quizzes for the selected course offering
     */
    const fetchQuizzes = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setQuizzes([])
            return
        }

        try {
            const response = await fetch(`/api/quizzes?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch quizzes')
            }
            const data = await response.json()
            const fetchedQuizzes = data.quizzes || []
            setQuizzes(fetchedQuizzes)

            // Set default to first quiz if available
            if (fetchedQuizzes.length > 0 && !selectedQuizId) {
                setSelectedQuizId(fetchedQuizzes[0].id)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch quizzes')
            setQuizzes([])
        }
    }, [selectedCourseOffering?.id, selectedQuizId])

    /**
     * Fetches analytics data for the selected quiz
     */
    const fetchAnalyticsData = useCallback(async () => {
        if (!selectedQuizId) {
            setAnalyticsData(null)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Fetch attempts and questions data in parallel
            const [attemptsResponse, questionsResponse] = await Promise.all([
                fetch(`/api/data/attempt?quizId=${selectedQuizId}`, {
                    credentials: 'include'
                }),
                fetch(`/api/data/question?quizId=${selectedQuizId}`, {
                    credentials: 'include'
                })
            ])

            if (!attemptsResponse.ok || !questionsResponse.ok) {
                throw new Error('Failed to fetch analytics data')
            }

            const attemptsData = await attemptsResponse.json()
            const questionsData = await questionsResponse.json()

            setAnalyticsData({
                attempts: attemptsData.attempts || [],
                questions: questionsData.items || [],
                totalStudents: attemptsData.totalStudents || 0
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch analytics data')
            setAnalyticsData(null)
        } finally {
            setLoading(false)
        }
    }, [selectedQuizId])

    // Fetch quizzes when course offering changes
    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    // Fetch analytics data when quiz selection changes
    useEffect(() => {
        fetchAnalyticsData()
    }, [fetchAnalyticsData])

    // Calculate key metrics
    const metrics = useMemo(() => {
        if (!analyticsData) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                completionRate: 0,
                studentAttemptRate: 0,
                averageQuestionDifficulty: 0
            }
        }

        const { attempts, questions, totalStudents } = analyticsData
        const totalAttempts = attempts.length
        const averageScore = totalAttempts > 0
            ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
            : 0
        const studentAttemptRate = totalStudents > 0
            ? (totalAttempts / totalStudents) * 100
            : 0
        const averageQuestionDifficulty = questions.length > 0
            ? questions.reduce((sum, q) => sum + (1 - q.average), 0) / questions.length
            : 0

        return {
            totalAttempts,
            averageScore,
            completionRate: 100, // All attempts in the API are completed
            studentAttemptRate,
            averageQuestionDifficulty
        }
    }, [analyticsData])


    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                {/* Header with Quiz Selector */}
                <Group gap="md" align="center" justify="space-between">
                    <Title order={2}>Quiz Analytics</Title>
                    <Select
                        value={selectedQuizId}
                        onChange={(value) => setSelectedQuizId(value)}
                        data={quizzes.map(quiz => ({
                            value: quiz.id,
                            label: quiz.title
                        }))}
                        placeholder="Select a quiz"
                        size="md"
                        w={300}
                        searchable
                        disabled={quizzes.length === 0}
                    />
                </Group>

                {loading && (
                    <Center h={400}>
                        <Stack align="center" gap="md">
                            <Loader size="lg" />
                            <Text>Loading analytics...</Text>
                        </Stack>
                    </Center>
                )}

                {error && (
                    <Alert title="Error" color="red">
                        {error}
                    </Alert>
                )}

                {!loading && !error && analyticsData && (
                    <>
                        {/* Key Metrics Cards */}
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                            <Card withBorder padding="md" radius="md">
                                <Text size="sm" c="dimmed" fw={500}>Total Attempts</Text>
                                <Text size="xl" fw={700} mt="xs">{metrics.totalAttempts}</Text>
                            </Card>
                            <Card withBorder padding="md" radius="md">
                                <Text size="sm" c="dimmed" fw={500}>Average Score</Text>
                                <Text size="xl" fw={700} mt="xs">
                                    {metrics.averageScore.toFixed(1)}%
                                </Text>
                            </Card>
                            <Card withBorder padding="md" radius="md">
                                <Text size="sm" c="dimmed" fw={500}>Completion Rate</Text>
                                <Text size="xl" fw={700} mt="xs">
                                    {metrics.completionRate.toFixed(1)}%
                                </Text>
                            </Card>
                            <Card withBorder padding="md" radius="md">
                                <Text size="sm" c="dimmed" fw={500}>% Student Attempted</Text>
                                <Text size="xl" fw={700} mt="xs">
                                    {metrics.studentAttemptRate.toFixed(1)}%
                                </Text>
                            </Card>
                        </SimpleGrid>

                        {/* Charts Section */}
                        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                            <ScoreDistributionChart attempts={analyticsData.attempts} />
                            <AttemptsOverTimeChart attempts={analyticsData.attempts} />
                        </SimpleGrid>

                        {/* Question Statistics Table */}
                        <QuestionStatsTable
                            questions={analyticsData.questions}
                            selectedQuizId={selectedQuizId}
                        />

                        {/* Student Performance Summary */}
                        <StudentStatsTable attempts={analyticsData.attempts} />
                    </>
                )}

                {!loading && !error && !analyticsData && selectedQuizId && (
                    <Alert title="No Data" color="blue">
                        No analytics data available for this quiz yet. Students need to complete attempts first.
                    </Alert>
                )}

                {!loading && quizzes.length === 0 && (
                    <Alert title="No Quizzes" color="blue">
                        No quizzes available for this course offering.
                    </Alert>
                )}
            </Stack>
        </Container>
    )
}

/**
 * Analytics page component
 * 
 * Displays comprehensive quiz analytics with charts, metrics, and tables.
 * 
 * Access Control:
 * - Requires authentication (ProtectedRoute)
 * - Restricted to instructors and TAs only (RoleBasedRoute)
 */
export default function AnalyticsPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access analytics."
            >
                <AnalyticsContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
