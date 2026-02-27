import { useCourse } from "@/lib/course-context"
import { Container, Stack, Title, Group, Text, Center, Loader, Card, Table, Badge } from "@mantine/core"
import { useState, useEffect, useCallback } from "react"
import { Quiz } from "@/types"
import { AttemptsOverTimeChart } from "@/components/Charts"

interface AttemptData {
    startedAt: string
    status?: string
}

interface ApiAttempt {
    startedAt: string
    status?: string
}

const InstructorDashboard = () => {
    const { selectedCourseOffering } = useCourse()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [allAttempts, setAllAttempts] = useState<AttemptData[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchQuizzes = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setQuizzes([])
            setAllAttempts([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/quizzes?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch quizzes')
            }
            const data = await response.json()
            setQuizzes(data.quizzes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch quizzes')
            setQuizzes([])
            setAllAttempts([])
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    const fetchAllAttempts = useCallback(async () => {
        if (!selectedCourseOffering?.id || quizzes.length === 0) {
            setAllAttempts([])
            return
        }

        try {
            // Fetch attempts for all quizzes in parallel
            const attemptPromises = quizzes.map(async (quiz) => {
                try {
                    const response = await fetch(`/api/data/attempt?quizId=${quiz.id}&includeIncomplete=true`, {
                        credentials: 'include'
                    })
                    if (!response.ok) {
                        return []
                    }
                    const data = await response.json()
                    return (data.attempts || []).map((attempt: ApiAttempt) => ({
                        startedAt: attempt.startedAt,
                        status: attempt.status
                    }))
                } catch (err) {
                    console.error(`Failed to fetch attempts for quiz ${quiz.id}:`, err)
                    return []
                }
            })

            const attemptsArrays = await Promise.all(attemptPromises)
            const combinedAttempts = attemptsArrays.flat()

            // Filter for past week
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            oneWeekAgo.setHours(0, 0, 0, 0)

            const pastWeekAttempts = combinedAttempts.filter((attempt) => {
                const startedAt = new Date(attempt.startedAt)
                return startedAt >= oneWeekAgo
            })

            setAllAttempts(pastWeekAttempts)
        } catch (err) {
            console.error('Failed to fetch attempts:', err)
            setAllAttempts([])
        }
    }, [selectedCourseOffering?.id, quizzes])

    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    useEffect(() => {
        if (quizzes.length > 0) {
            fetchAllAttempts()
        }
    }, [quizzes, fetchAllAttempts])

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'gray'
        if (score >= 80) return 'green'
        if (score >= 60) return 'yellow'
        return 'red'
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <Group align="center">
                    <Title order={2}>Dashboard</Title>
                </Group>

                {/* Attempts Over Time Chart */}
                {!loading && quizzes.length > 0 && (
                    <AttemptsOverTimeChart attempts={allAttempts} />
                )}

                {loading ? (
                    <Center h={300}>
                        <Stack align="center" gap="md">
                            <Loader size="lg" />
                            <Text>Loading quizzes...</Text>
                        </Stack>
                    </Center>
                ) : error ? (
                    <Card withBorder padding="lg" radius="md">
                        <Text c="red" size="sm">
                            Error: {error}
                        </Text>
                    </Card>
                ) : quizzes.length === 0 ? (
                    <Card withBorder padding="lg" radius="md">
                        <Center h={200}>
                            <Text c="dimmed">No quizzes found for this course.</Text>
                        </Center>
                    </Card>
                ) : (
                    <Card withBorder padding={0} radius="md" shadow="sm">
                        <Table.ScrollContainer minWidth={600}>
                            <Table verticalSpacing="md" horizontalSpacing="lg" striped highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>
                                            <Text fw={600} size="sm">Quiz Title</Text>
                                        </Table.Th>
                                        <Table.Th>
                                            <Text fw={600} size="sm">Total Attempts</Text>
                                        </Table.Th>
                                        <Table.Th>
                                            <Text fw={600} size="sm">Average Score</Text>
                                        </Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {quizzes.map((quiz) => (
                                        <Table.Tr key={quiz.id}>
                                            <Table.Td>
                                                <Text fw={500} size="sm">
                                                    {quiz.title}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                {quiz.stats.totalAttempts}
                                            </Table.Td>
                                            <Table.Td>
                                                {quiz.stats.averageScore !== null ? (
                                                    <Group gap={4}>
                                                        <Badge
                                                            variant="light"
                                                            color={getScoreColor(quiz.stats.averageScore)}
                                                            size="md"
                                                        >
                                                            {quiz.stats.averageScore.toFixed(1)}%
                                                        </Badge>
                                                    </Group>
                                                ) : (
                                                    <Badge variant="light" color="gray" size="md">
                                                        No data
                                                    </Badge>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}
            </Stack>
        </Container>
    )
}

export default InstructorDashboard
