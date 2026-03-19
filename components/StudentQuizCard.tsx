import { Card, Stack, Group, Button, Text } from "@mantine/core"
import { Quiz } from "@prisma/client"
import { useRouter } from "next/navigation"

const StudentQuizCard = ({ quiz }: { quiz: Quiz }) => {
    const router = useRouter()

    const handleTakeQuiz = () => {
        router.push(`/quiz/${quiz.id}`)
    }

    return (
        <Card withBorder padding="lg" radius="md" h="100%">
            <Stack gap="md" h="100%">
                <Group justify="space-between" align="flex-start">
                    <Text size="lg" fw={600} lineClamp={2}>
                        {quiz.title}
                    </Text>
                </Group>

                <Button
                    variant="filled"
                    fullWidth
                    onClick={handleTakeQuiz}
                    mt="auto"
                    color='dark'
                    aria-label={`Take Quiz: ${quiz.title}`}
                >
                    Take Quiz
                </Button>
            </Stack>
        </Card>
    )
}

export default StudentQuizCard
