'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Container, Group, Stack, Text, Title, Card, Loader, Center } from '@mantine/core'
import { logout, getCurrentUser, User } from '@/lib/client-auth'

export default function HomePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const router = useRouter()

    const handleLogout = async () => {
        setLoading(true)
        const result = await logout()

        if ('error' in result) {
            console.error('Logout error:', result.error)
        } else {
            // Redirect to login page after logout
            router.push('/login')
        }

        setLoading(false)
    }

    const checkSession = useCallback(async () => {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        setCheckingSession(false)

        // If no user found, redirect to login
        if (!currentUser) {
            router.push('/login')
        }
    }, [router])

    useEffect(() => {
        checkSession()
    }, [checkSession])

    // Show loading spinner while checking session
    if (checkingSession) {
        return (
            <Container size="sm" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    // This should only render if user is authenticated
    // (redirect happens in checkSession if not authenticated)
    if (!user) {
        return null // Will redirect to login
    }

    return (
        <Container size="sm" py="xl">
            <Stack gap="lg">
                <Group justify="space-between">
                    <Title order={2}>StudyCAT</Title>
                    <Button variant="light" onClick={handleLogout} loading={loading}>
                        Logout
                    </Button>
                </Group>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <Text size="lg" fw={600}>Welcome back!</Text>
                        <Text>Username: <Text span fw={500}>{user.username}</Text></Text>
                        <Text>Role: <Text span fw={500}>{user.role}</Text></Text>
                    </Stack>
                </Card>
            </Stack>
        </Container>
    )
}
