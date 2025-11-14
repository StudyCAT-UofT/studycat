'use client'

import { Paper, Title, Group, Badge, Text, Box, Flex } from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'
import { useMemo, useState, useEffect } from 'react'

export interface QuestionData {
    questionId: string
    itemId: string
    stem: string
    moduleName: string | null
    average: number
    numAttempts: number
    averageA: number
    averageB: number
    averageC: number
    averageD: number
    options: Array<{
        id: string
        label: string
        text: string
        isCorrect: boolean
    }>
}

interface QuestionStatsTableProps {
    questions: QuestionData[]
    selectedQuizId: string | null
}

export const QuestionStatsTable = ({ questions, selectedQuizId }: QuestionStatsTableProps) => {
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<QuestionData>>({
        columnAccessor: 'questionId',
        direction: 'asc'
    })
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)

    // Reset page when quiz changes
    useEffect(() => {
        setPage(1)
    }, [selectedQuizId])

    // Sort questions based on sort status
    const sortedQuestions = useMemo(() => {
        if (!questions || questions.length === 0) return []

        const sorted = [...questions].sort((a, b) => {
            const { columnAccessor, direction } = sortStatus
            const aValue: any = a[columnAccessor as keyof QuestionData]
            const bValue: any = b[columnAccessor as keyof QuestionData]

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0
            if (aValue == null) return direction === 'asc' ? 1 : -1
            if (bValue == null) return direction === 'asc' ? -1 : 1

            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const aLower = aValue.toLowerCase()
                const bLower = bValue.toLowerCase()
                if (aLower < bLower) return direction === 'asc' ? -1 : 1
                if (aLower > bLower) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Handle number comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                if (aValue < bValue) return direction === 'asc' ? -1 : 1
                if (aValue > bValue) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Fallback for other types
            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }, [questions, sortStatus])

    // Paginate sorted questions for display
    const paginatedQuestions = useMemo(() => {
        const start = (page - 1) * pageSize
        const end = start + pageSize
        return sortedQuestions.slice(start, end)
    }, [sortedQuestions, page, pageSize])

    // Expanded row content for question table
    const expandedRowContent = ({ record }: { record: QuestionData }) => {
        const optionPercentages = {
            A: record.averageA * 100,
            B: record.averageB * 100,
            C: record.averageC * 100,
            D: record.averageD * 100,
        }

        return (
            <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
                <Text fw={500} mb="sm">Question Options:</Text>
                <Flex direction="row" gap="sm" wrap="wrap">
                    {record.options.map((option) => {
                        const percentage = optionPercentages[option.label as 'A' | 'B' | 'C' | 'D'] || 0
                        return (
                            <Box
                                key={option.id}
                                p="sm"
                                style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '6px',
                                    backgroundColor: option.isCorrect ? '#d1ecf1' : 'white',
                                    minWidth: 200,
                                    flex: '1 1 200px'
                                }}
                            >
                                <Group justify="space-between" mb="xs">
                                    <Group gap="xs" align="center">
                                        <Text fw={500} size="sm">
                                            Option {option.label}
                                        </Text>
                                        {option.isCorrect && (
                                            <Badge size="xs" color="green">
                                                Correct
                                            </Badge>
                                        )}
                                    </Group>
                                    <Badge size="sm" variant="light">
                                        {percentage.toFixed(1)}%
                                    </Badge>
                                </Group>
                                <Text size="sm" mb="xs">{option.text}</Text>
                            </Box>
                        )
                    })}
                </Flex>
            </Box>
        )
    }

    // Question table columns
    const questionColumns = [
        {
            accessor: 'questionId',
            title: 'Question ID',
            sortable: true,
            width: 150,
        },
        {
            accessor: 'stem',
            title: 'Stem',
            sortable: true,
            width: 300,
            render: (question: QuestionData) => (
                <Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
                    {question.stem}
                </Text>
            )
        },
        {
            accessor: 'moduleName',
            title: 'Module',
            sortable: true,
            width: 150,
            render: (question: QuestionData) => (
                <Text size="sm" c={question.moduleName ? undefined : 'dimmed'}>
                    {question.moduleName || 'N/A'}
                </Text>
            )
        },
        {
            accessor: 'average',
            title: 'Correct Rate',
            sortable: true,
            width: 120,
            render: (question: QuestionData) => (
                <Text fw={500}>
                    {(question.average * 100).toFixed(1)}%
                </Text>
            )
        },
        {
            accessor: 'numAttempts',
            title: 'Attempts',
            sortable: true,
            width: 100,
        },
    ]

    return (
        <Paper withBorder p="md" radius="md">
            <Group gap="md" mb="md" align="center">
                <Title order={4}>Question-Level Statistics</Title>
                <Badge size="lg" variant="light">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                </Badge>
            </Group>
            <DataTable
                key={`questions-${selectedQuizId}`}
                records={paginatedQuestions}
                columns={questionColumns}
                sortStatus={sortStatus}
                onSortStatusChange={(status) => {
                    setSortStatus(status)
                    setPage(1)
                }}
                rowExpansion={{
                    content: expandedRowContent
                }}
                minHeight={200}
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                withRowBorders
                page={page}
                onPageChange={(newPage) => {
                    setPage(newPage)
                }}
                totalRecords={sortedQuestions.length}
                recordsPerPage={pageSize}
                paginationActiveBackgroundColor="blue"
                idAccessor="itemId"
            />
        </Paper>
    )
}

