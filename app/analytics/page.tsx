'use client'

import { Container, Stack, Title, Select, Card, SimpleGrid, Text, Group, Loader, Center, Alert, Button, Menu } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { ScoreDistributionChart, AttemptsOverTimeChart, ModulePerformanceRadarChart } from '@/components/Charts'
import { QuestionStatsTable, StudentStatsTable } from '@/components/Tables'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { QuestionData, Quiz } from '@/types'
import { IconChevronDown, IconDownload } from '@tabler/icons-react'
import { ExportDataModal } from '@/components/Modals'

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
    status?: string
}

interface AnalyticsData {
    attempts: AttemptData[]
    allAttempts: AttemptData[] // All attempts including incomplete for chart
    questions: QuestionData[]
    totalStudents: number
    totalAttempts: number // Total attempts including incomplete
    uniqueStudentsAttempted: number // Unique students who have attempted
}

/**
 * Main content component for the analytics page
 * Displays comprehensive quiz analytics with charts and metrics
 */
type ExportDataType = 'attempt' | 'question' | 'theta' | null

const AnalyticsContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exportModalOpen, setExportModalOpen] = useState(false)
    const [exportDataType, setExportDataType] = useState<ExportDataType>(null)
    const [includeIncomplete, setIncludeIncomplete] = useState(false)
    const [exportLoading, setExportLoading] = useState(false)

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
            // Fetch attempts (completed only), all attempts (for chart), and questions data in parallel
            const [attemptsResponse, allAttemptsResponse, questionsResponse] = await Promise.all([
                fetch(`/api/data/attempt?quizId=${selectedQuizId}`, {
                    credentials: 'include'
                }),
                fetch(`/api/data/attempt?quizId=${selectedQuizId}&includeIncomplete=true`, {
                    credentials: 'include'
                }),
                fetch(`/api/data/question?quizId=${selectedQuizId}&includeIncomplete=true`, {
                    credentials: 'include'
                })
            ])

            if (!attemptsResponse.ok || !allAttemptsResponse.ok || !questionsResponse.ok) {
                throw new Error('Failed to fetch analytics data')
            }

            const attemptsData = await attemptsResponse.json()
            const allAttemptsData = await allAttemptsResponse.json()
            const questionsData = await questionsResponse.json()

            setAnalyticsData({
                attempts: attemptsData.attempts || [],
                allAttempts: allAttemptsData.attempts || [],
                questions: questionsData.items || [],
                totalStudents: attemptsData.totalStudents || 0,
                totalAttempts: attemptsData.totalAttempts || 0,
                uniqueStudentsAttempted: attemptsData.uniqueStudentsAttempted || 0
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
                averageScore: null as number | null,
                completionRate: null as number | null,
                studentAttemptRate: 0,
                averageQuestionDifficulty: 0
            }
        }

        const { attempts, questions, totalStudents, totalAttempts: allAttempts, uniqueStudentsAttempted } = analyticsData
        const completedAttempts = attempts.length
        const averageScore = completedAttempts > 0
            ? attempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts
            : null
        // Calculate student attempt rate based on unique students who attempted, not total attempts
        const studentAttemptRate = totalStudents > 0
            ? (uniqueStudentsAttempted / totalStudents) * 100
            : 0
        const averageQuestionDifficulty = questions.length > 0
            ? questions.reduce((sum, q) => sum + (1 - q.average), 0) / questions.length
            : 0

        // Calculate completion rate: completed attempts / total attempts (including incomplete)
        const completionRate = allAttempts > 0
            ? (completedAttempts / allAttempts) * 100
            : null

        return {
            totalAttempts: allAttempts, // Show total attempts including incomplete
            averageScore,
            completionRate,
            studentAttemptRate,
            averageQuestionDifficulty
        }
    }, [analyticsData])

    /**
     * Gets the selected quiz title
     */
    const selectedQuizTitle = useMemo(() => {
        return quizzes.find(q => q.id === selectedQuizId)?.title || 'Unknown Quiz'
    }, [quizzes, selectedQuizId])

    /**
     * Opens the export confirmation modal for the specified data type
     */
    const handleExportClick = (dataType: ExportDataType) => {
        setExportDataType(dataType)
        setIncludeIncomplete(false)
        setExportModalOpen(true)
    }

    /**
     * Downloads JSON data as a file
     */
    const downloadJson = (data: unknown, filename: string) => {
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    /**
     * Handles the export confirmation and downloads the data
     */
    const handleExportConfirm = useCallback(async () => {
        if (!selectedQuizId || !exportDataType) return

        setExportLoading(true)
        try {
            let url = ''
            let filename = ''

            if (exportDataType === 'attempt') {
                url = `/api/data/attempt?quizId=${selectedQuizId}&includeIncomplete=${includeIncomplete}`
                filename = `attempt-data-${selectedQuizId}${includeIncomplete ? '-all' : '-completed'}.json`
            } else if (exportDataType === 'question') {
                url = `/api/data/question?quizId=${selectedQuizId}&includeIncomplete=${includeIncomplete}`
                filename = `question-data-${selectedQuizId}${includeIncomplete ? '-all' : '-completed'}.json`
            } else if (exportDataType === 'theta') {
                if (!selectedCourseOffering?.id) {
                    throw new Error('Course offering ID is required for theta data')
                }
                url = `/api/data/theta?courseOfferingId=${selectedCourseOffering.id}`
                filename = `theta-data-${selectedCourseOffering.id}.json`
            }

            const response = await fetch(url, {
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch ${exportDataType} data`)
            }

            const data = await response.json()
            downloadJson(data, filename)
            setExportModalOpen(false)
            setExportDataType(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to export ${exportDataType} data`)
        } finally {
            setExportLoading(false)
        }
    }, [selectedQuizId, exportDataType, includeIncomplete, selectedCourseOffering?.id])


    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                {/* Header with Quiz Selector */}
                <Group gap="md" align="center" justify="space-between">
                    <Title order={2}>Quiz Analytics</Title>
                    <Group gap="sm" align="center">
                        <Text size="sm" fw={500}>Selected Quiz:</Text>
                        <Select
                            value={selectedQuizId}
                            onChange={(value) => setSelectedQuizId(value)}
                            data={quizzes.map(quiz => ({
                                value: quiz.id,
                                label: quiz.title
                            }))}
                            placeholder="Select a quiz"
                            w={300}
                            searchable
                            disabled={quizzes.length === 0}
                        />
                        <Menu>
                            <Menu.Target>
                                <Button
                                    variant="default"
                                    disabled={!selectedQuizId}
                                    leftSection={<IconDownload size={18} />}
                                    rightSection={<IconChevronDown size={18} />}
                                >
                                    Export
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={() => handleExportClick('attempt')}>
                                    Attempt Data
                                </Menu.Item>
                                <Menu.Item onClick={() => handleExportClick('question')}>
                                    Question Data
                                </Menu.Item>
                                <Menu.Item onClick={() => handleExportClick('theta')}>
                                    Theta Data
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
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
                                    {metrics.averageScore !== null
                                        ? `${metrics.averageScore.toFixed(1)}%`
                                        : 'N/A'}
                                </Text>
                            </Card>
                            <Card withBorder padding="md" radius="md">
                                <Text size="sm" c="dimmed" fw={500}>Completion Rate</Text>
                                <Text size="xl" fw={700} mt="xs">
                                    {metrics.completionRate !== null
                                        ? `${metrics.completionRate.toFixed(1)}%`
                                        : 'N/A'}
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
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <ScoreDistributionChart attempts={analyticsData.attempts} />
                            <AttemptsOverTimeChart attempts={analyticsData.allAttempts} />
                        </SimpleGrid>

                        {/* Module Performance Radar Chart */}
                        <ModulePerformanceRadarChart questions={analyticsData.questions} />

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

            {/* Export Confirmation Modal */}
            <ExportDataModal
                opened={exportModalOpen}
                onClose={() => {
                    setExportModalOpen(false)
                    setExportDataType(null)
                }}
                exportDataType={exportDataType}
                quizTitle={selectedQuizTitle}
                includeIncomplete={includeIncomplete}
                onIncludeIncompleteChange={setIncludeIncomplete}
                onConfirm={handleExportConfirm}
                loading={exportLoading}
            />
        </Container >
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
