'use client'

import { Container, Stack, Text, Center, Loader } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import StudentDashboard from '@/components/Dashboards/StudentDashboard'
import InstructorDashboard from '@/components/Dashboards/InstructorDashboard'

/**
 * Main dashboard component that shows different content based on role
 */
const DashboardContent = () => {
    const { selectedCourseOffering } = useCourse()

    // Show loading while determining user role
    if (!selectedCourseOffering) {
        return (
            <Container size="md" py="xl">
                <Center>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    // Show student dashboard for students
    if (selectedCourseOffering.role === 'STUDENT') {
        return (
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['STUDENT']
                }}
                unauthorizedMessage="This page is only accessible to students."
            >
                <StudentDashboard />
            </RoleBasedRoute>
        )
    }

    // Show instructor dashboard for instructors and TAs
    return (
        <RoleBasedRoute
            permissions={{
                requireAnyRole: ['INSTRUCTOR', 'TA']
            }}
            unauthorizedMessage="This page is only accessible to instructors and TAs."
        >
            <InstructorDashboard />
        </RoleBasedRoute>
    )
}

export default function HomePage() {
    return (
        <ProtectedRoute>
            <DashboardContent />
        </ProtectedRoute>
    )
}
