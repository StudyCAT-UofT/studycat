import { useCourse } from "@/lib/course-context"
import { Container, Center, Stack, Loader, Alert, Title, Group, Badge, Card, SimpleGrid, Text } from "@mantine/core"
import { Quiz } from "@prisma/client"
import { useState, useCallback, useEffect } from "react"
import StudentQuizCard from "@/components/StudentQuizCard"

const StudentDashboard = () => {
    const { selectedCourseOffering } = useCourse()
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

    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading quizzes...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    if (error) {
        return (
            <Container size="lg" py="xl">
                <Alert title="Error" color="red">
                    {error}
                </Alert>
            </Container>
        )
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                <Stack gap="md">
                    <Title order={2}>{selectedCourseOffering?.course?.code}</Title>
                    <Text size="lg" c="dimmed">
                        {selectedCourseOffering?.course?.title}
                    </Text>
                </Stack>

                <Stack gap="lg">
                    <Group gap="md" align="center">
                        <Title order={3}>All Quizzes</Title>
                        <Badge size="lg" variant="light">
                            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}
                        </Badge>
                    </Group>

                    {quizzes.length === 0 ? (
                        <Card withBorder padding="xl" radius="md">
                            <Center>
                                <Stack align="center" gap="md">
                                    <Text size="lg" c="dimmed">
                                        No quizzes available at this time.
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Check back later or contact your instructor.
                                    </Text>
                                </Stack>
                            </Center>
                        </Card>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                            {quizzes.map((quiz) => (
                                <StudentQuizCard key={quiz.id} quiz={quiz} />
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Stack>
        </Container>
    )
}

export default StudentDashboard