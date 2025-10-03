'use client'

import { Container, Stack, Text, Title, Card, Button, Loader, Center } from '@mantine/core'
import { useAuth } from '@/lib/auth-context'
import { AuthenticatedLayout } from './AuthenticatedLayout'

interface ProtectedRouteProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

export const ProtectedRoute = ({ children, fallback }: ProtectedRouteProps) => {
    const { user, loading, isAuthenticated } = useAuth()

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

    if (!isAuthenticated || !user) {
        if (fallback) {
            return <>{fallback}</>
        }

        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="md">
                    <Title order={2}>Access Denied</Title>
                    <Card withBorder padding="lg" radius="md">
                        <Stack align="center" gap="md">
                            <Text>You need to be logged in to access this page.</Text>
                            <Button
                                component="a"
                                href="/login"
                                variant="filled"
                            >
                                Go to Login
                            </Button>
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        )
    }

    return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
