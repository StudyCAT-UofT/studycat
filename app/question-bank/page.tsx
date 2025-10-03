'use client'

import { Container, Stack, Text, Title, Card, Table, Badge, ScrollArea } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState } from 'react'

interface Item {
    id: string
    externalQuestionId: string
    module: string
    bloom: string
    stem: string
    reference: string | null
    figureUrl: string | null
    ptBi: number | null
    average: number | null
    attemptsCount: number | null
    irtA: number
    irtB: number
    irtC: number
    active: boolean
    createdAt: string
    options: Array<{
        id: string
        label: string
        text: string
        justification: string | null
        isCorrect: boolean
    }>
}

const QuestionBankContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchItems = async () => {
            if (!selectedCourseOffering?.course?.id) {
                setItems([])
                return
            }

            setLoading(true)
            setError(null)

            try {
                const response = await fetch(`/api/items?courseId=${selectedCourseOffering.course.id}`)
                if (!response.ok) {
                    throw new Error('Failed to fetch items')
                }
                const data = await response.json()
                setItems(data.items || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch items')
                setItems([])
            } finally {
                setLoading(false)
            }
        }

        fetchItems()
    }, [selectedCourseOffering?.course?.id])

    const getBloomColor = (bloom: string) => {
        const colors: Record<string, string> = {
            REMEMBER: 'blue',
            UNDERSTAND: 'green',
            APPLY: 'yellow',
            ANALYZE: 'orange',
            EVALUATE: 'red',
            CREATE: 'purple'
        }
        return colors[bloom] || 'gray'
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Title order={2}>Question Bank</Title>

                <Card withBorder padding="lg" radius="md">
                    <Stack>
                        {loading && <Text c="dimmed">Loading items...</Text>}

                        {error && (
                            <Text c="red" size="sm">
                                Error: {error}
                            </Text>
                        )}

                        {!loading && !error && (
                            <>
                                <Text c="dimmed">
                                    {items.length} question{items.length !== 1 ? 's' : ''} in the question bank
                                </Text>

                                {items.length > 0 ? (
                                    <ScrollArea>
                                        <Table striped highlightOnHover>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>ID</Table.Th>
                                                    <Table.Th>Module</Table.Th>
                                                    <Table.Th>Bloom&apos;s</Table.Th>
                                                    <Table.Th>Question Stem</Table.Th>
                                                    <Table.Th>Options</Table.Th>
                                                    <Table.Th>Stats</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {items.map((item) => (
                                                    <Table.Tr key={item.id}>
                                                        <Table.Td>
                                                            <Text size="sm" fw={500}>
                                                                {item.externalQuestionId}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm">{item.module}</Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Badge color={getBloomColor(item.bloom)} size="sm">
                                                                {item.bloom}
                                                            </Badge>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
                                                                {item.stem}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Text size="xs" c="dimmed">
                                                                {item.options.length} option{item.options.length !== 1 ? 's' : ''}
                                                            </Text>
                                                        </Table.Td>
                                                        <Table.Td>
                                                            <Stack gap={2}>
                                                                {item.average && (
                                                                    <Text size="xs" c="dimmed">
                                                                        Avg: {item.average.toFixed(2)}
                                                                    </Text>
                                                                )}
                                                                {item.attemptsCount && (
                                                                    <Text size="xs" c="dimmed">
                                                                        Attempts: {item.attemptsCount}
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
                                        No questions found in the question bank.
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

export default function QuestionBankPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access the question bank."
            >
                <QuestionBankContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
