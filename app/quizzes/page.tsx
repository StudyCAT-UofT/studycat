'use client'

import { Container, Stack, Text, Title, Card, Table, Badge, ScrollArea, Skeleton, Group } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'

/**
 * Quiz data structure returned from the API
 */
interface Quiz {
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
            const response = await fetch(`/api/quizzes?courseOfferingId=${selectedCourseOffering.id}`)
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
     * Returns the appropriate badge color based on quiz status
     */
    const getStatusColor = useCallback((isActive: boolean) => {
        return isActive ? 'green' : 'gray'
    }, [])

    /**
     * Memoized quiz count display text to prevent unnecessary re-renders
     */
    const quizCountText = useMemo(() => {
        if (loading || error) return null
        return `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`
    }, [quizzes.length, loading, error])

    /**
     * Memoized skeleton rows for loading state
     */
    const skeletonRows = useMemo(() =>
        Array.from({ length: 3 }).map((_, index) => (
            <Table.Tr key={index}>
                <Table.Td>
                    <Skeleton height={20} width={150} />
                </Table.Td>
                <Table.Td>
                    <Skeleton height={20} width={80} />
                </Table.Td>
                <Table.Td>
                    <Skeleton height={24} width={60} radius="xl" />
                </Table.Td>
                <Table.Td>
                    <Skeleton height={20} width={40} />
                </Table.Td>
                <Table.Td>
                    <Skeleton height={20} width={80} />
                </Table.Td>
                <Table.Td>
                    <Stack gap={2}>
                        <Skeleton height={14} width={70} />
                        <Skeleton height={14} width={90} />
                    </Stack>
                </Table.Td>
            </Table.Tr>
        )), [])

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center">
                    <Title order={2}>Quizzes</Title>
                    {quizCountText && (
                        <Badge size="lg" variant="light">
                            {quizCountText}
                        </Badge>
                    )}
                </Group>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        {loading && (
                            <ScrollArea>
                                <Table striped>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Quiz Title</Table.Th>
                                            <Table.Th>Module</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Questions</Table.Th>
                                            <Table.Th>Created</Table.Th>
                                            <Table.Th>Stats</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {skeletonRows}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        )}

                        {error && (
                            <Text c="red" size="sm" role="alert" aria-live="polite">
                                Error: {error}
                            </Text>
                        )}

                        {!loading && !error && (
                            <>
                                {quizzes.length > 0 ? (
                                    <ScrollArea>
                                        <Table striped highlightOnHover role="table" aria-label="Quizzes table">
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>Quiz Title</Table.Th>
                                                    <Table.Th>Module</Table.Th>
                                                    <Table.Th>Status</Table.Th>
                                                    <Table.Th>Questions</Table.Th>
                                                    <Table.Th>Created</Table.Th>
                                                    <Table.Th>Stats</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {quizzes.map((quiz) => (
                                                    <Table.Tr key={quiz.id}>
                                                        <Table.Td>
                                                            <Stack gap={2}>
                                                                <Text size="sm" fw={500}>
                                                                    {quiz.title}
                                                                </Text>
                                                                {quiz.description && (
                                                                    <Text size="xs" c="dimmed" lineClamp={1}>
                                                                        {quiz.description}
                                                                    </Text>
                                                                )}
                                                            </Stack>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{quiz.module}</Text>
                                                            {quiz.modules.length > 1 && (
                                                                <Text size="xs" c="dimmed">
                                                                    +{quiz.modules.length - 1} more
                                                                </Text>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge color={getStatusColor(quiz.isActive)} size="sm">
                                                                {quiz.isActive ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{quiz.fixedLength}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">
                                                                {new Date(quiz.createdAt).toLocaleDateString()}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Stack gap={2}>
                                                                {quiz.stats.totalAttempts > 0 ? (
                                                                    <>
                                                                        <Text size="xs" c="dimmed">
                                                                            Attempts: {quiz.stats.totalAttempts}
                                                                        </Text>
                                                                        {quiz.stats.averageScore && (
                                                                            <Text size="xs" c="dimmed">
                                                                                Avg: {quiz.stats.averageScore.toFixed(1)}%
                                                                            </Text>
                                                                        )}
                                                                        {quiz.stats.completionRate && (
                                                                            <Text size="xs" c="dimmed">
                                                                                Complete: {quiz.stats.completionRate.toFixed(1)}%
                                                                            </Text>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <Text size="xs" c="dimmed">
                                                                        No attempts yet
                                                                    </Text>
                                                                )}
                                                            </Stack>
                                                        </Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </ScrollArea>
                                ) : (
                                    <Text c="dimmed" ta="center" py="xl">
                                        No quizzes found for this course.
                                    </Text>
                                )}
                            </>
                        )}
                    </Stack>
                </Card>
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
