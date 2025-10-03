'use client'

import { Container, Stack, Title, Alert, Button, Loader, Center } from '@mantine/core'
import { useCourse } from '@/lib/course-context'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Define the possible course roles
export type CourseRole = 'INSTRUCTOR' | 'TA' | 'STUDENT'

// Define permission requirements
export interface RolePermissionRequirement {
    // Require specific roles (must have ALL - AND logic)
    requireRoles?: CourseRole[]
    // Require at least one of the specified roles (OR logic)
    requireAnyRole?: CourseRole[]
}

interface RoleBasedRouteProps {
    children: React.ReactNode
    fallback?: React.ReactNode
    // Permission requirements for this route
    permissions: RolePermissionRequirement
    // Custom message for unauthorized access
    unauthorizedMessage?: string
    // Redirect path for unauthorized users (defaults to '/')
    redirectTo?: string
}

// Helper function to check permissions
const checkRolePermissions = (
    permissions: RolePermissionRequirement,
    userRole: CourseRole | undefined
): boolean => {
    // If no user role, deny access
    if (!userRole) {
        return false
    }

    // Check requireRoles (must have ALL specified roles - AND logic)
    if (permissions.requireRoles) {
        return permissions.requireRoles.includes(userRole)
    }

    // Check requireAnyRole (must have at least ONE of the specified roles - OR logic)
    if (permissions.requireAnyRole) {
        return permissions.requireAnyRole.includes(userRole)
    }

    // Default to denying access if no valid permissions specified
    return false
}

export const RoleBasedRoute = ({
    children,
    fallback,
    permissions,
    unauthorizedMessage,
    redirectTo = '/'
}: RoleBasedRouteProps) => {
    const { selectedCourseOffering, loading } = useCourse()
    const router = useRouter()

    // Check if user has required permissions
    const hasPermission = checkRolePermissions(permissions, selectedCourseOffering?.role as CourseRole)

    // Redirect unauthorized users when course data is loaded
    useEffect(() => {
        if (!loading && selectedCourseOffering && !hasPermission) {
            router.push(redirectTo)
        }
    }, [loading, selectedCourseOffering, hasPermission, router, redirectTo])

    // Show loading while course data is loading
    if (loading || !selectedCourseOffering) {
        return (
            <Container size="sm" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                    </Stack>
                </Center>
            </Container>
        )
    }

    // Check course permissions
    if (!hasPermission) {
        if (fallback) {
            return <>{fallback}</>
        }

        const defaultMessage = permissions.requireAnyRole
            ? `This page is only accessible to ${permissions.requireAnyRole.join(' or ').toLowerCase()}s.`
            : permissions.requireRoles
                ? `This page requires ${permissions.requireRoles.join(' and ').toLowerCase()} access.`
                : 'You do not have permission to access this page.'

        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="md">
                    <Title order={2}>Access Denied</Title>
                    <Alert title="Insufficient Permissions" color="red">
                        {unauthorizedMessage || defaultMessage}
                    </Alert>
                    <Button
                        onClick={() => router.push(redirectTo)}
                        variant="filled"
                    >
                        Go Back
                    </Button>
                </Stack>
            </Container>
        )
    }

    return <>{children}</>
}
