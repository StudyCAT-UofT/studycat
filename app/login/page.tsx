'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Container, Stack, Text, TextInput, Title, Card, Alert } from '@mantine/core'
import { login, getCurrentUser } from '@/lib/client-auth'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [checkingSession, setCheckingSession] = useState(true)
    const router = useRouter()

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
            // Redirect to home page after successful login
            router.push('/')
        }

        setLoading(false)
    }

    const checkExistingSession = useCallback(async () => {
        const currentUser = await getCurrentUser()
        if (currentUser) {
            // User is already logged in, redirect to home
            router.push('/')
        } else {
            setCheckingSession(false)
        }
    }, [router])

    useEffect(() => {
        checkExistingSession()
    }, [checkExistingSession])

    if (checkingSession) {
        return (
            <Container size="sm" py="xl">
                <Stack align="center" gap="md">
                    <Text>Checking session...</Text>
                </Stack>
            </Container>
        )
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
