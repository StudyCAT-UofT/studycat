'use client'

import { Container, Stack, Text, Title, Card } from '@mantine/core'
import { ProtectedRoute } from '@/components'
import { useAuth } from '@/lib/auth-context'

export default function HomePage() {
    const { user } = useAuth()

    return (
        <ProtectedRoute>
            <Container size="sm" py="xl">
                <Stack gap="lg">
                    <Title order={2}>Dashboard</Title>

                    <Card withBorder padding="lg" radius="md">
                        <Stack>
                            <Text size="lg" fw={600}>Welcome back!</Text>
                            {user && (
                                <>
                                    <Text>Username: <Text span fw={500}>{user.username}</Text></Text>
                                    <Text>Role: <Text span fw={500}>{user.role}</Text></Text>
                                </>
                            )}
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </ProtectedRoute>
    )
}
