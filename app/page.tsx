'use client'

import { useRouter } from 'next/navigation'
import { Container, Stack, Text, Title, SimpleGrid, Center, Loader, Card } from '@mantine/core'
import { ProtectedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { CourseCard } from '@/components/CourseCard'

/**
 * Course selection grid component
 */
const CourseSelectionContent = () => {
    const router = useRouter()
    const { courseOfferings, setSelectedCourseOffering, loading } = useCourse()

    const handleCourseSelect = (courseOfferingId: string) => {
        const selectedOffering = courseOfferings.find(co => co.id === courseOfferingId)
        if (!selectedOffering) return
        const courseCode = selectedOffering.course.code 
        const term = selectedOffering.term.name
        
        setSelectedCourseOffering(selectedOffering)
        router.push(`/${courseCode}/${term.replace(/\s+/g, '-')}/quiz`)
    }

    // Loading state
    if (loading) {
        return (
            <Container size="lg" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading courses...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    // No enrollments state
    if (courseOfferings.length === 0) {
        return (
            <Container size="md" py="xl">
                <Stack gap="lg">
                    <Title order={1}>Courses</Title>
                    <Card withBorder padding="xl" radius="md">
                        <Center>
                            <Stack align="center" gap="md">
                                <Text size="lg" c="dimmed">
                                    No courses available.
                                </Text>
                                <Text size="sm" c="dimmed">
                                    You are not enrolled in any courses. Please contact your instructor or administrator.
                                </Text>
                            </Stack>
                        </Center>
                    </Card>
                </Stack>
            </Container>
        )
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Stack gap="xs">
                    <Title order={1}>Courses</Title>
                    <Text>
                        Select a course to view quizzes and activities
                    </Text>
                </Stack>

                {/* Course cards grid */}
                <SimpleGrid
                    cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    spacing="lg"
                >
                    {courseOfferings.map((offering) => (
                        <CourseCard
                            key={offering.id}
                            courseOffering={offering}
                            onClick={() => handleCourseSelect(offering.id)}
                        />
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    )
}

/**
 * Home page - Course selection dashboard
 */
export default function HomePage() {
    return (
        <ProtectedRoute>
            <CourseSelectionContent />
        </ProtectedRoute>
    )
}
