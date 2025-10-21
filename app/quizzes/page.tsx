'use client'

import { Container, Stack, Title, Badge, Group } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute, QuizzesTable } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'

/**
 * Quiz data structure returned from the API
 */
export interface Quiz {
    id: string
    title: string
    description: string | null
    modules: string[]
    module: string // Primary module for display
    fixedLength: number
    timeLimit: number | null // Not in schema but kept for compatibility
    maxAttempts: number | null // Not in schema but kept for compatibility
    isActive: boolean
    dueDate: string | null // Not in schema but kept for compatibility
    createdAt: string
    updatedAt: string
    createdBy: string
    stats: {
        totalAttempts: number
        averageScore: number | null
        completionRate: number | null
    }
    includedModules: string[]
    includedBlooms: string[]
}

/**
 * Main content component for the quizzes page
 * Displays a table of quizzes with statistics for the selected course offering
 */
const QuizzesContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Fetches quizzes for the selected course offering
     * Resets state when course offering changes
     */
    const fetchQuizzes = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setQuizzes([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/quizzes?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch quizzes')
            }
            const data = await response.json()
            setQuizzes(data.quizzes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch quizzes')
            setQuizzes([])
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    // Fetch quizzes when course offering changes
    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    /**
     * Memoized quiz count display text to prevent unnecessary re-renders
     */
    const quizCountText = useMemo(() => {
        if (loading || error) return null
        return `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`
    }, [quizzes.length, loading, error])

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center">
                    <Title order={2}>Quizzes</Title>
                    {quizCountText && (
                        <Badge size="lg" variant="light">
                            {quizCountText}
                        </Badge>
                    )}
                </Group>

                <QuizzesTable quizzes={quizzes} loading={loading} error={error} />
            </Stack>
        </Container>
    )
}

/**
 * Quizzes page component
 * 
 * Displays a comprehensive list of quizzes for the selected course offering.
 * Includes statistics, loading states, and error handling.
 * 
 * Access Control:
 * - Requires authentication (ProtectedRoute)
 * - Restricted to instructors and TAs only (RoleBasedRoute)
 */
export default function QuizzesPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access quizzes."
            >
                <QuizzesContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
