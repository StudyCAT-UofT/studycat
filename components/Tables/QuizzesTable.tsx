'use client'

import { useState, useMemo } from 'react'
import {
    Text,
    Badge,
    Group,
    ActionIcon,
    Box,
    Stack
} from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'
import { IconEdit } from '@tabler/icons-react'
import { Quiz } from '@/types'

interface QuizzesTableProps {
    quizzes: Quiz[]
    loading: boolean
    error: string | null
    selectedRecords?: Quiz[]
    onSelectedRecordsChange?: (records: Quiz[]) => void
    onEditQuiz?: (quiz: Quiz) => void
}

export const QuizzesTable = ({
    quizzes,
    loading,
    error,
    selectedRecords: externalSelectedRecords,
    onSelectedRecordsChange,
    onEditQuiz
}: QuizzesTableProps) => {
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Quiz>>({
        columnAccessor: 'title',
        direction: 'asc'
    })
    const [internalSelectedRecords, setInternalSelectedRecords] = useState<Quiz[]>([])

    // Use external selected records if provided, otherwise use internal state
    const selectedRecords = externalSelectedRecords !== undefined ? externalSelectedRecords : internalSelectedRecords
    const setSelectedRecords = onSelectedRecordsChange || setInternalSelectedRecords
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)

    const handleSortStatusChange = (newSortStatus: DataTableSortStatus<Quiz>) => {
        setSortStatus(newSortStatus)
        setPage(1) // Reset to first page when sorting changes
    }

    // Sort the quizzes based on the current sort status
    const sortedQuizzes = useMemo(() => {
        const sorted = [...quizzes].sort((a, b) => {
            const { columnAccessor, direction } = sortStatus
            const aValue = a[columnAccessor as keyof Quiz]
            const bValue = b[columnAccessor as keyof Quiz]

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

            // Handle date comparison
            if (columnAccessor === 'createdAt') {
                const aDate = new Date(aValue as string)
                const bDate = new Date(bValue as string)
                if (aDate < bDate) return direction === 'asc' ? -1 : 1
                if (aDate > bDate) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Fallback for other types
            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })
        return sorted
    }, [quizzes, sortStatus])

    // Paginate sorted quizzes for display
    const paginatedQuizzes = useMemo(() => {
        const start = (page - 1) * pageSize
        const end = start + pageSize
        return sortedQuizzes.slice(start, end)
    }, [sortedQuizzes, page, pageSize])

    const getStatusColor = (isActive: boolean) => {
        return isActive ? 'green' : 'gray'
    }

    const columns = [
        {
            accessor: 'title',
            title: 'Quiz Title',
            sortable: true,
            width: 250,
            render: (quiz: Quiz) => (
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
            )
        },
        {
            accessor: 'module',
            title: 'Modules (Mastery)',
            sortable: false,
            width: 250,
            render: (quiz: Quiz) => (
                <Stack gap={2}>
                {quiz.quizModules?.map((module, index) => (
                    <Badge key={index} size="sm" variant="light">
                    {quiz.modules ? quiz.modules[index] : "NULL"} ({(module.masteryThreshold)})
                    </Badge>
                ))}
                </Stack>
            )
        },
        {
            accessor: 'isActive',
            title: 'Status',
            sortable: true,
            width: 100,
            render: (quiz: Quiz) => (
                <Badge color={getStatusColor(quiz.isActive)} size="sm">
                    {quiz.isActive ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            accessor: 'fixedLength',
            title: 'Questions',
            sortable: true,
            width: 100,
            render: (quiz: Quiz) => (
                <Text size="sm">{quiz.fixedLength}</Text>
            )
        },
        {
            accessor: 'createdAt',
            title: 'Created',
            sortable: true,
            width: 120,
            render: (quiz: Quiz) => (
                <Text size="sm">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                </Text>
            )
        },
        {
            accessor: 'stats',
            title: 'Stats',
            sortable: false,
            width: 150,
            render: (quiz: Quiz) => (
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
            )
        },
        {
            accessor: 'actions',
            title: 'Actions',
            width: 100,
            sticky: 'right',
            sortable: false,
            render: (quiz: Quiz) => (
                <Group gap="xs">
                    <ActionIcon
                        variant="subtle"
                        onClick={(e) => {
                            e.stopPropagation()
                            if (onEditQuiz) {
                                onEditQuiz(quiz)
                            }
                        }}
                    >
                        <IconEdit size={16} />
                    </ActionIcon>
                </Group>
            )
        }
    ]

    const expandedRowContent = ({ record }: { record: Quiz }) => (
        <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Stack gap="md">
                {record.modules && (
                    <div>
                        <Text fw={500} mb="xs">Included Modules:</Text>
                        <Group gap="xs">
                            {record.modules?.map((module, index) => (
                                <Badge key={index} size="sm" variant="light">
                                    {module}
                                </Badge>
                            ))}
                        </Group>
                        {/* TODO - include detailed quiz stats here */}
                    </div>
                )}
            </Stack>
        </Box>
    )

    if (error) {
        return (
            <Text c="red" size="sm">
                Error: {error}
            </Text>
        )
    }

    return (
        <DataTable
            records={paginatedQuizzes}
            columns={columns}
            sortStatus={sortStatus}
            onSortStatusChange={handleSortStatusChange}
            selectedRecords={selectedRecords}
            onSelectedRecordsChange={setSelectedRecords}
            rowExpansion={{
                content: expandedRowContent
            }}
            fetching={loading}
            minHeight={200}
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            withRowBorders
            page={page}
            onPageChange={setPage}
            totalRecords={sortedQuizzes.length}
            recordsPerPage={pageSize}
            paginationActiveBackgroundColor="blue"
            idAccessor="id"
            noRecordsText="No quizzes found for this course."
        />
    )
}
