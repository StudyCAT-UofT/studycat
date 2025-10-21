import { useAuth } from "@/lib/auth-context"
import { useCourse } from "@/lib/course-context"
import { Container, Stack, Title, Card, Group, Button, Text } from "@mantine/core"
import { useRouter } from "next/router"

const InstructorDashboard = () => {
    const { user } = useAuth()
    const { selectedCourseOffering } = useCourse()
    const router = useRouter()

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Title order={2}>Dashboard</Title>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <Text size="lg" fw={600}>Welcome back!</Text>
                        {user && (
                            <>
                                <Text>Username: <Text span fw={500}>{user.username}</Text></Text>
                                <Text>Role: <Text span fw={500}>{selectedCourseOffering?.role}</Text></Text>
                            </>
                        )}
                    </Stack>
                </Card>

                <Group gap="md">
                    <Button
                        variant="filled"
                        onClick={() => router.push('/quizzes')}
                    >
                        View Quizzes
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/question-bank')}
                    >
                        Question Bank
                    </Button>
                </Group>
            </Stack>
        </Container>
    )
}

export default InstructorDashboard