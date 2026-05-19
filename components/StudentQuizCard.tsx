import { Card, Stack, Group, Button, Text } from "@mantine/core"
import { Quiz } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useCourse } from '@/lib/course-context'


const StudentQuizCard = ({ quiz }: { quiz: Quiz }) => {
    const router = useRouter()
    const { selectedCourseOffering, setSelectedCourseOffering } = useCourse()
    if (!selectedCourseOffering) return

    setSelectedCourseOffering(selectedCourseOffering)
    
    const handleTakeQuiz = () => {
        router.push(`/${selectedCourseOffering.course.code}/quiz/${quiz.id}`)
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
