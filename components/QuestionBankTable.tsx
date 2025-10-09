'use client'

import { Card, Stack, Text, Table, Badge, ScrollArea, Skeleton } from '@mantine/core'

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

interface QuestionBankTableProps {
    items: Item[]
    loading: boolean
    error: string | null
}

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

export const QuestionBankTable = ({ items, loading, error }: QuestionBankTableProps) => {
    const getTableRows = (items: Item[]) => {
        return items.map((item) => (
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
        ))
    }

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack>
                {loading && (
                    <ScrollArea>
                        <Table striped>
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
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <Table.Tr key={index}>
                                        <Table.Td>
                                            <Skeleton height={20} width={60} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Skeleton height={20} width={80} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Skeleton height={24} width={70} radius="xl" />
                                        </Table.Td>
                                        <Table.Td>
                                            <Skeleton height={20} width={300} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Skeleton height={16} width={50} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Stack gap={2}>
                                                <Skeleton height={14} width={60} />
                                                <Skeleton height={14} width={80} />
                                            </Stack>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}

                {error && (
                    <Text c="red" size="sm">
                        Error: {error}
                    </Text>
                )}

                {!loading && !error && (
                    <>
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
                                        {getTableRows(items)}
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
    )
}

