'use client'

import { useState, useMemo } from 'react'
import {
    Card,
    Stack,
    Text,
    Badge,
    Group,
    ActionIcon,
    Box
} from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'
import { IconEdit } from '@tabler/icons-react'
import EditQuestionModal from './EditQuestionModal'
import { getBloomColor } from '@/utils/getBloomColor'

export interface Item {
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

export const QuestionBankTable = ({ items, loading, error }: QuestionBankTableProps) => {
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Item>>({ columnAccessor: 'externalQuestionId', direction: 'asc' })
    const [selectedRecords, setSelectedRecords] = useState<Item[]>([])
    const [editModalOpened, setEditModalOpened] = useState(false)
    const [editingItem, setEditingItem] = useState<Item | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)

    const handleEdit = (item: Item) => {
        setEditingItem(item)
        setEditModalOpened(true)
    }

    const handleSortStatusChange = (newSortStatus: DataTableSortStatus<Item>) => {
        setSortStatus(newSortStatus)
        setPage(1) // Reset to first page when sorting changes
    }

    // Sort the items based on the current sort status
    const sortedItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => {
            const { columnAccessor, direction } = sortStatus
            const aValue = a[columnAccessor as keyof Item]
            const bValue = b[columnAccessor as keyof Item]

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
    }, [items, sortStatus])

    const columns = [
        {
            accessor: 'externalQuestionId',
            title: 'ID',
            sortable: true,
            width: 100,
        },
        {
            accessor: 'module',
            title: 'Module',
            sortable: true,
            width: 120,
        },
        {
            accessor: 'bloom',
            title: "Bloom's",
            sortable: true,
            width: 120,
            render: (item: Item) => (
                <Badge color={getBloomColor(item.bloom)} size="sm">
                    {item.bloom}
                </Badge>
            )
        },
        {
            accessor: 'stem',
            title: 'Question Stem',
            sortable: true,
            width: 300,
            render: (item: Item) => (
                <Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
                    {item.stem}
                </Text>
            )
        },
        {
            accessor: 'average',
            title: 'Average',
            sortable: true,
            width: 100,
            render: (item: Item) => (
                <Text size="sm" c={item.average ? undefined : 'dimmed'}>
                    {item.average ? `${(item.average * 100).toFixed(1)}%` : 'N/A'}
                </Text>
            )
        },
        {
            accessor: 'attemptsCount',
            title: 'Attempts',
            sortable: true,
            width: 120,
            render: (item: Item) => (
                <Text size="sm" c={item.attemptsCount ? undefined : 'dimmed'}>
                    {item.attemptsCount || 'N/A'}
                </Text>
            )
        },
        {
            accessor: 'actions',
            title: 'Actions',
            width: 100,
            sticky: 'right',
            sortable: false,
            render: (item: Item) => (
                <Group gap="xs">
                    <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(item)
                        }}
                    >
                        <IconEdit size={16} />
                    </ActionIcon>
                </Group>
            )
        }
    ]

    const expandedRowContent = ({ record }: { record: Item }) => (
        <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Text fw={500} mb="sm">Question Options:</Text>
            <Stack gap="sm">
                {record.options.map((option) => (
                    <Box
                        key={option.id}
                        p="sm"
                        style={{
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            backgroundColor: option.isCorrect ? '#d1ecf1' : 'white'
                        }}
                    >
                        <Group justify="space-between" mb="xs">
                            <Text fw={500} size="sm">
                                Option {option.label}
                                {option.isCorrect && (
                                    <Badge size="xs" color="green" ml="xs">
                                        Correct
                                    </Badge>
                                )}
                            </Text>
                        </Group>
                        <Text size="sm" mb="xs">{option.text}</Text>
                        {option.justification && (
                            <Text size="xs" c="dimmed" fs="italic">
                                Justification: {option.justification}
                            </Text>
                        )}
                    </Box>
                ))}
            </Stack>
        </Box>
    )

    if (error) {
        return (
            <Card withBorder padding="lg" radius="md">
                <Text c="red" size="sm">
                    Error: {error}
                </Text>
            </Card>
        )
    }

    return (
        <>
            <DataTable
                records={sortedItems}
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
                totalRecords={sortedItems.length}
                recordsPerPage={pageSize}
                paginationActiveBackgroundColor="blue"
                idAccessor="id"
            />

            <EditQuestionModal
                item={editingItem}
                opened={editModalOpened}
                onClose={() => {
                    setEditModalOpened(false)
                    setEditingItem(null)
                }}
            />
        </>
    )
}

