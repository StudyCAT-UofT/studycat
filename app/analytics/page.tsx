'use client'

import { Container, Stack, Title, Select, Card, SimpleGrid, Text, Group, Badge, Paper, Loader, Center, Alert, Box, Flex } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Quiz } from '@/types'
import { BarChart } from '@mantine/charts'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'

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

interface QuestionData {
    questionId: string
    itemId: string
    stem: string
    moduleName: string | null
    average: number
    numAttempts: number
    averageA: number
    averageB: number
    averageC: number
    averageD: number
    options: Array<{
        id: string
        label: string
        text: string
        isCorrect: boolean
    }>
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
    const [questionSortStatus, setQuestionSortStatus] = useState<DataTableSortStatus<QuestionData>>({
        columnAccessor: 'questionId',
        direction: 'asc'
    })
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)

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

    // Reset page when quiz changes
    useEffect(() => {
        setPage(1)
    }, [selectedQuizId])

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

    // Prepare score distribution data for histogram
    const scoreDistributionData = useMemo(() => {
        if (!analyticsData) return []

        // Create bins: 0-9, 10-19, 20-29, ..., 90-99, 100
        const bins: Array<{ min: number; max: number; label: string }> = []

        // Create bins from 0-9 up to 90-99
        for (let i = 0; i < 10; i++) {
            bins.push({
                min: i * 10,
                max: i * 10 + 9,
                label: `${i * 10}-${i * 10 + 9}`
            })
        }

        // Add the 100 bin separately
        bins.push({
            min: 100,
            max: 100,
            label: '100'
        })

        const distribution = bins.map(bin => {
            const count = analyticsData.attempts.filter(
                a => a.score >= bin.min && a.score <= bin.max
            ).length
            return {
                range: bin.label,
                count
            }
        })

        return distribution
    }, [analyticsData])

    // Prepare attempts over time data
    const attemptsOverTimeData = useMemo(() => {
        if (!analyticsData) return []

        // Group attempts by date (using local date, not UTC)
        const dateMap = new Map<string, number>()

        analyticsData.attempts.forEach(attempt => {
            const date = new Date(attempt.startedAt)
            // Use local date string (YYYY-MM-DD) for consistent date handling
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
        })

        // Generate array of past 7 days (using local time)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset to start of day

        const past7Days: Array<{ date: string; count: number }> = []

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)

            // Create date key using local date
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`

            // Format for display
            const displayDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })

            past7Days.push({
                date: displayDate,
                count: dateMap.get(dateKey) || 0
            })
        }

        return past7Days
    }, [analyticsData])

    // Sort questions based on sort status
    const sortedQuestions = useMemo(() => {
        if (!analyticsData) return []

        const sorted = [...analyticsData.questions].sort((a, b) => {
            const { columnAccessor, direction } = questionSortStatus
            const aValue: any = a[columnAccessor as keyof QuestionData]
            const bValue: any = b[columnAccessor as keyof QuestionData]

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0
            if (aValue == null) return direction === 'asc' ? 1 : -1
            if (bValue == null) return direction === 'asc' ? -1 : 1

            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const aLower = aValue.toLowerCase()
                const bLower = bValue.toLowerCase()
                if (aLower < bLower) return direction === 'asc' ? -1 : 1
                if (aLower > bLower) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Handle number comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                if (aValue < bValue) return direction === 'asc' ? -1 : 1
                if (aValue > bValue) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Fallback for other types
            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }, [analyticsData, questionSortStatus])

    // Paginate sorted questions for display
    const paginatedQuestions = useMemo(() => {
        const start = (page - 1) * pageSize
        const end = start + pageSize
        return sortedQuestions.slice(start, end)
    }, [sortedQuestions, page, pageSize])

    // Expanded row content for question table
    const expandedRowContent = ({ record }: { record: QuestionData }) => {
        const optionPercentages = {
            A: record.averageA * 100,
            B: record.averageB * 100,
            C: record.averageC * 100,
            D: record.averageD * 100,
        }

        return (
            <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Text fw={500} mb="sm">Question Options:</Text>
                <Flex direction="row" gap="sm" wrap="wrap">
                    {record.options.map((option) => {
                        const percentage = optionPercentages[option.label as 'A' | 'B' | 'C' | 'D'] || 0
                        return (
                            <Box
                                key={option.id}
                                p="sm"
                                style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px',
                                    backgroundColor: option.isCorrect ? '#d1ecf1' : 'white',
                                    minWidth: 200,
                                    flex: '1 1 200px'
                                }}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Group gap="xs" align="center">
                                        <Text fw={500} size="sm">
                                            Option {option.label}
                                        </Text>
                                        {option.isCorrect && (
                                            <Badge size="xs" color="green">
                                                Correct
                                            </Badge>
                                        )}
                                    </Group>
                                    <Badge size="sm" variant="light">
                                        {percentage.toFixed(1)}%
                                    </Badge>
                                </Group>
                                <Text size="sm" mb="xs">{option.text}</Text>
                            </Box>
                        )
                    })}
                </Flex>
            </Box>
        )
    }

    // Question table columns
    const questionColumns = [
        {
            accessor: 'questionId',
            title: 'Question ID',
            sortable: true,
            width: 150,
        },
        {
            accessor: 'stem',
            title: 'Stem',
            sortable: true,
            width: 300,
            render: (question: QuestionData) => (
                <Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
                    {question.stem}
                </Text>
            )
        },
        {
            accessor: 'moduleName',
            title: 'Module',
            sortable: true,
            width: 150,
            render: (question: QuestionData) => (
                <Text size="sm" c={question.moduleName ? undefined : 'dimmed'}>
                    {question.moduleName || 'N/A'}
                </Text>
            )
        },
        {
            accessor: 'average',
            title: 'Correct Rate',
            sortable: true,
            width: 120,
            render: (question: QuestionData) => (
                <Text fw={500}>
                    {(question.average * 100).toFixed(1)}%
                </Text>
            )
        },
        {
            accessor: 'numAttempts',
            title: 'Attempts',
            sortable: true,
            width: 100,
        },
    ]

    const selectedQuiz = quizzes.find(q => q.id === selectedQuizId)

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
                            {/* Score Distribution Histogram */}
                            <Paper withBorder p="md" radius="md">
                                <Title order={4} mb="md">Score Distribution</Title>
                                {scoreDistributionData.length > 0 ? (
                                    <BarChart
                                        h={300}
                                        data={scoreDistributionData}
                                        dataKey="range"
                                        series={[{ name: 'count', color: 'blue.6', label: 'Number of Students' }]}
                                        tickLine="y"
                                        withLegend
                                    />
                                ) : (
                                    <Text c="dimmed" ta="center" py="xl">No data available</Text>
                                )}
                            </Paper>

                            {/* Attempts Over Time Chart */}
                            <Paper withBorder p="md" radius="md">
                                <Title order={4} mb="md">Attempts Over Time</Title>
                                {attemptsOverTimeData.length > 0 ? (
                                    <BarChart
                                        h={300}
                                        data={attemptsOverTimeData}
                                        dataKey="date"
                                        series={[{ name: 'count', color: 'green.6', label: 'Number of Attempts' }]}
                                        tickLine="y"
                                        withLegend
                                    />
                                ) : (
                                    <Text c="dimmed" ta="center" py="xl">No data available</Text>
                                )}
                            </Paper>
                        </SimpleGrid>

                        {/* Question Statistics Table */}
                        <Paper withBorder p="md" radius="md">
                            <Group gap="md" mb="md" align="center">
                                <Title order={4}>Question-Level Statistics</Title>
                                <Badge size="lg" variant="light">
                                    {analyticsData.questions.length} question{analyticsData.questions.length !== 1 ? 's' : ''}
                                </Badge>
                            </Group>
                            <DataTable
                                key={`questions-${selectedQuizId}`}
                                records={paginatedQuestions}
                                columns={questionColumns}
                                sortStatus={questionSortStatus}
                                onSortStatusChange={(status) => {
                                    setQuestionSortStatus(status)
                                    setPage(1)
                                }}
                                rowExpansion={{
                                    content: expandedRowContent
                                }}
                                minHeight={200}
                                striped
                                highlightOnHover
                                withTableBorder
                                withColumnBorders
                                withRowBorders
                                page={page}
                                onPageChange={(newPage) => {
                                    setPage(newPage)
                                }}
                                totalRecords={sortedQuestions.length}
                                recordsPerPage={pageSize}
                                paginationActiveBackgroundColor="blue"
                                idAccessor="itemId"
                            />
                        </Paper>

                        {/* Student Performance Summary */}
                        {analyticsData.attempts.length > 0 && (
                            <Paper withBorder p="md" radius="md">
                                <Title order={4} mb="md">Student Performance Summary</Title>
                                <DataTable
                                    records={analyticsData.attempts
                                        .sort((a, b) => b.score - a.score)
                                        .map((attempt) => {
                                            const correctCount = attempt.questions.filter(q => q.isCorrect).length
                                            return {
                                                ...attempt,
                                                correctCount,
                                                totalQuestions: attempt.questions.length
                                            }
                                        })}
                                    columns={[
                                        {
                                            accessor: 'username',
                                            title: 'Username',
                                            sortable: true,
                                        },
                                        {
                                            accessor: 'score',
                                            title: 'Score',
                                            sortable: true,
                                            render: (record: any) => (
                                                <Badge
                                                    color={
                                                        record.score >= 80 ? 'green' :
                                                            record.score >= 60 ? 'yellow' : 'red'
                                                    }
                                                >
                                                    {record.score.toFixed(1)}%
                                                </Badge>
                                            )
                                        },
                                        {
                                            accessor: 'totalQuestions',
                                            title: 'Questions Answered',
                                            sortable: true,
                                        },
                                        {
                                            accessor: 'correctCount',
                                            title: 'Correct Answers',
                                            sortable: true,
                                        },
                                    ]}
                                    minHeight={200}
                                    striped
                                    highlightOnHover
                                    withTableBorder
                                    withColumnBorders
                                    withRowBorders
                                />
                            </Paper>
                        )}
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
