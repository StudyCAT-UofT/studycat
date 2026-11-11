'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Container, Stack, Text, TextInput, Title, Card, Alert } from '@mantine/core'
import { login, redirectToShibbolethLogin } from '@/lib/client-auth'
import { useAuth } from '@/lib/auth-context'

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
    missing_utorid: 'Single sign-on did not provide a UTORid. Please try again.',
    user_not_found: 'Your UTORid is not registered in Catalyze. Please contact your instructor.',
    authentication_failed: 'Login failed. Please try again.',
}
export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [authMode, setAuthMode] = useState<'simple' | 'shibboleth'>('simple')
    const [authModeLoading, setAuthModeLoading] = useState(true)
    const router = useRouter()
    const { user, loading: authLoading, refreshUser } = useAuth()

    // Fetch auth mode from environment
    useEffect(() => {
        const mode = process.env.NEXT_PUBLIC_AUTH_MODE || 'simple'
        setAuthMode(mode as 'simple' | 'shibboleth')

        // The callback redirects back here with ?error=... when it can't log the user in
        const callbackError = new URLSearchParams(window.location.search).get('error')
        if (callbackError) {
            setError(CALLBACK_ERROR_MESSAGES[callbackError] ?? CALLBACK_ERROR_MESSAGES.authentication_failed)
        }

        setAuthModeLoading(false)
    }, [])

    // Shibboleth mode in production: go straight through the SP instead of showing a
    // second login page. If Apache already holds a Shibboleth session, the SP forwards
    // to the callback without prompting. Skipped after a callback error to avoid a
    // redirect loop, and in development, where there may be no SP in front of the app
    // (e.g. when using /mock-shibboleth).
    useEffect(() => {
        if (
            !authModeLoading &&
            !authLoading &&
            !user &&
            authMode === 'shibboleth' &&
            !error &&
            process.env.NODE_ENV === 'production'
        ) {
            redirectToShibbolethLogin()
        }
    }, [authModeLoading, authLoading, user, authMode, error])

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

    if (authLoading || authModeLoading) {
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

    // Shibboleth Mode: Redirect to SP
    if (authMode === 'shibboleth') {
        return (
            <main>
                <Container size="sm" py="xl">
                    <Stack gap="lg">
                        <Title order={1}>Catalyze Login</Title>

                        {error && (
                            <Alert color="red" title="Error">
                                {error}
                            </Alert>
                        )}

                        <Card withBorder padding="lg" radius="md">
                            <Stack gap="md">
                                <Text size="sm">
                                    This application uses UTORid single sign-on for authentication.
                                </Text>
                                <Button
                                    onClick={redirectToShibbolethLogin}
                                    fullWidth
                                    size="lg"
                                    variant='filled'
                                    color='dark'
                                >
                                    Login with UTORid
                                </Button>
                            </Stack>
                        </Card>
                    </Stack>
                </Container>
            </main>
        )
    }

    // Simple Mode: Username-only authentication
    return (
        <main>
            <Container size="sm" py="xl">
                <Stack gap="lg">
                    <Title order={1}>Catalyze Login</Title>

                    {error && (
                        <Alert color="red" title="Error">
                            {error}
                        </Alert>
                    )}

                    <Card withBorder padding="lg" radius="md">
                        <Stack>
                            <TextInput
                                label="UTORid"
                                placeholder="Enter your UTORid"
                                value={username}
                                onChange={(e) => setUsername(e.currentTarget.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            />
                            <Button
                                onClick={handleLogin}
                                loading={loading}
                                fullWidth
                                variant='filled'
                                color='dark'
                            >
                                Login
                            </Button>
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </main>
    )
}
