'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Stack, Text, Center, Loader } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import StudentDashboard from '@/components/Dashboards/StudentDashboard'
import InstructorDashboard from '@/components/Dashboards/InstructorDashboard'

/**
 * Quiz dashboard content that shows different content based on role
 */
const QuizDashboardContent = () => {
    const router = useRouter()
    const { selectedCourseOffering, loading } = useCourse()

    // Redirect to course selection if no course is selected
    useEffect(() => {
        if (!loading && !selectedCourseOffering) {
            router.replace('/')
        }
    }, [loading, selectedCourseOffering, router])

    // Show loading while determining course/role
    if (loading) {
        return (
            <Container size="md" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    // Show loading while redirecting (no course selected)
    if (!selectedCourseOffering) {
        return (
            <Container size="md" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Redirecting to course selection...</Text>
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
                redirectTo="/"
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
            redirectTo="/"
        >
            <InstructorDashboard />
        </RoleBasedRoute>
    )
}

/**
 * Quiz dashboard page - shows role-appropriate content for selected course
 */
export default function QuizDashboardPage() {
    return (
        <ProtectedRoute>
            <QuizDashboardContent />
        </ProtectedRoute>
    )
}
