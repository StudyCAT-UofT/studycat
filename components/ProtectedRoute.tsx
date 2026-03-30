'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Stack, Loader, Center } from '@mantine/core'
import { useAuth } from '@/lib/auth-context'
import { AuthenticatedLayout } from './AuthenticatedLayout'

interface ProtectedRouteProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
    const { user, loading, isAuthenticated } = useAuth()
    const router = useRouter()

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && (!isAuthenticated || !user)) {
            router.replace('/login')
        }
    }, [loading, isAuthenticated, user, router])

    if (loading) {
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

    // Show loader while redirecting (prevents flash of content)
    if (!isAuthenticated || !user) {
        if (fallback) {
            return <>{fallback}</>
        }

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

    return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
