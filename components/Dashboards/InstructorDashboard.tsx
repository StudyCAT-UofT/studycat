import { useCourse } from "@/lib/course-context"
import { Container, Stack, Title, Group, Button, Text, Center, Loader, Card, Table, Badge } from "@mantine/core"
import { IconUpload, IconUsers, IconChartBar } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Quiz } from "@/types"

const InstructorDashboard = () => {
    const { selectedCourseOffering } = useCourse()
    const router = useRouter()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchQuizzes = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setQuizzes([])
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
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'gray'
        if (score >= 80) return 'green'
        if (score >= 60) return 'yellow'
        return 'red'
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <Group justify="space-between" align="center">
                    <Title order={2}>Dashboard</Title>
                    <Button
                        leftSection={<IconUpload size={16} />}
                        onClick={() => router.push('/upload')}
                        disabled={!selectedCourseOffering}
                    >
                        Upload Questions
                    </Button>
                </Group>

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
                                                <Group gap={4}>
                                                    <Badge variant="light" color="blue" size="md">
                                                        {quiz.stats.totalAttempts}
                                                    </Badge>
                                                </Group>
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