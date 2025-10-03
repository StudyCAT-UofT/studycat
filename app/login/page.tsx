'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Container, Stack, Text, TextInput, Title, Card, Alert } from '@mantine/core'
import { login } from '@/lib/client-auth'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const { user, loading: authLoading, refreshUser } = useAuth()

    const handleLogin = async () => {
        if (!username.trim()) {
            setError('Please enter a username')
            return
        }

        setLoading(true)
        setError('')

        const result = await login(username.trim())

        if ('error' in result) {
            setError(result.error)
        } else {
            // Refresh user state and redirect to home page after successful login
            await refreshUser()
            router.push('/')
        }

        setLoading(false)
    }

    // Redirect if user is already authenticated
    useEffect(() => {
        if (!authLoading && user) {
            router.push('/')
        }
    }, [user, authLoading, router])

    if (authLoading) {
        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="md">
                    <Text>Checking session...</Text>
                </Stack>
            </Container>
        )
    }

    // Don't render login form if user is authenticated
    if (user) {
        return null
    }

    return (
        <Container size="sm" py="xl">
            <Stack gap="lg">
                <Title order={2}>StudyCAT Login</Title>

                {error && (
                    <Alert color="red" title="Error">
                        {error}
                    </Alert>
                )}

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        <TextInput
                            label="Username"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                        <Button
                            onClick={handleLogin}
                            loading={loading}
                            fullWidth
                        >
                            Login
                        </Button>
                    </Stack>
                </Card>

                <Text size="sm" c="dimmed" ta="center">
                    Enter your username to access StudyCAT. No password required.
                </Text>
            </Stack>
        </Container>
    )
}
