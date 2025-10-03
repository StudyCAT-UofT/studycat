'use client'

import { Container, Stack, Text, Title, Card } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'

const QuestionBankContent = () => {
    const { selectedCourseOffering } = useCourse()

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Title order={2}>Question Bank</Title>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <Text size="lg" fw={600}>Course Question Bank</Text>
                        {selectedCourseOffering && (
                            <Text>
                                Course: <Text span fw={500}>{selectedCourseOffering.display}</Text>
                            </Text>
                        )}
                        <Text c="dimmed">
                            This is where instructors and TAs can manage questions for the course.
                            Question bank functionality will be implemented here.
                        </Text>
                    </Stack>
                </Card>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <Text size="md" fw={600}>Available Actions</Text>
                        <Text c="dimmed">
                            • View all questions in the course bank
                        </Text>
                        <Text c="dimmed">
                            • Create new questions
                        </Text>
                        <Text c="dimmed">
                            • Edit existing questions
                        </Text>
                        <Text c="dimmed">
                            • Organize questions by modules and Bloom&apos;s taxonomy
                        </Text>
                        <Text c="dimmed">
                            • Import questions from spreadsheets
                        </Text>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    )
}

export default function QuestionBankPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access the question bank."
            >
                <QuestionBankContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
