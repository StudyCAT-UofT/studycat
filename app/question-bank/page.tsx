'use client'

import { Container, Stack, Text, Title, Card, Alert } from '@mantine/core'
// import { IconInfoCircle } from '@tabler/icons-react'
import { ProtectedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const QuestionBankContent = () => {
    const { selectedCourseOffering, loading } = useCourse()
    const router = useRouter()

    // Check authorization directly without state
    const isAuthorized = selectedCourseOffering?.role === 'INSTRUCTOR' || selectedCourseOffering?.role === 'TA'

    // Redirect unauthorized users immediately when course data is loaded
    useEffect(() => {
        if (!loading && selectedCourseOffering && !isAuthorized) {
            router.push('/')
        }
    }, [loading, selectedCourseOffering, isAuthorized, router])

    // Show loading state while course data is loading
    if (loading || !selectedCourseOffering) {
        return (
            <Container size="md" py="xl">
                <Text>Loading...</Text>
            </Container>
        )
    }

    // This should not render for unauthorized users, but just in case
    if (!isAuthorized) {
        return (
            <Container size="md" py="xl">
                <Alert title="Access Denied" color="red">
                    You do not have permission to access the question bank. Only instructors and TAs can view this page.
                </Alert>
            </Container>
        )
    }

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
            <QuestionBankContent />
        </ProtectedRoute>
    )
}
