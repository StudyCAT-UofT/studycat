'use client'

import { Card, Stack, Text, Table, Badge, ScrollArea, Skeleton } from '@mantine/core'
import { useMemo, useCallback } from 'react'

interface Quiz {
    id: string
    title: string
    description: string | null
    modules: string[]
    module: string
    fixedLength: number
    timeLimit: number | null
    maxAttempts: number | null
    isActive: boolean
    dueDate: string | null
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

interface QuizzesTableProps {
    quizzes: Quiz[]
    loading: boolean
    error: string | null
}

export const QuizzesTable = ({ quizzes, loading, error }: QuizzesTableProps) => {
    const getStatusColor = useCallback((isActive: boolean) => {
        return isActive ? 'green' : 'gray'
    }, [])

    const getTableRows = (quizzes: Quiz[]) => {
        return quizzes.map((quiz) => (
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
        ))
    }

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
                                        {getTableRows(quizzes)}
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
    )
}

