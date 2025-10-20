import { Card, Stack, Group, Button, Text } from "@mantine/core"
import { Quiz } from "@prisma/client"

const StudentQuizCard = ({ quiz }: { quiz: Quiz }) => {
    const handleTakeQuiz = () => {
        console.log('Taking quiz:', quiz.id)
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
                >
                    Take Quiz
                </Button>
            </Stack>
        </Card>
    )
}

export default StudentQuizCard