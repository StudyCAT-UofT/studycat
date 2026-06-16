'use client'

import { useState, useMemo, useEffect } from 'react'
import {
    Card,
    Text,
    Badge,
    Group,
    ActionIcon,
    Box,
    Flex,
    VisuallyHidden
} from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'
import { IconEdit } from '@tabler/icons-react'
import { EditQuestionModal } from '@/components/Modals'
import { getBloomColor } from '@/utils/getBloomColor'
import { Item } from '@/types'


interface QuestionBankTableProps {
    items: Item[]
    loading: boolean
    error: string | null
    onRefresh?: () => void
    selectedRecords?: Item[]
    onSelectedRecordsChange?: (records: Item[]) => void
}

export const QuestionBankTable = ({ items, loading, error, onRefresh, selectedRecords: externalSelectedRecords, onSelectedRecordsChange }: QuestionBankTableProps) => {
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Item>>({ columnAccessor: 'externalQuestionId', direction: 'asc' })
    const [internalSelectedRecords, setInternalSelectedRecords] = useState<Item[]>([])

    // Use external selected records if provided, otherwise use internal state
    const selectedRecords = externalSelectedRecords !== undefined ? externalSelectedRecords : internalSelectedRecords
    const setSelectedRecords = onSelectedRecordsChange || setInternalSelectedRecords
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

    // Paginate sorted items for display
    const paginatedItems = useMemo(() => {
        const start = (page - 1) * pageSize
        const end = start + pageSize
        return sortedItems.slice(start, end)
    }, [sortedItems, page, pageSize])

    // Fix empty th on checkbox column
    useEffect(() => {
        const selectorTh = document.querySelector('th[data-accessor="__selection__"]')
        if (selectorTh) {
            selectorTh.setAttribute('title', 'Select rows')
            selectorTh.setAttribute('aria-label', 'Select rows')
        }
    }, [paginatedItems])

    const columns = [
        {
            accessor: 'externalQuestionId',
            title: 'ID',
            sortable: true,
            width: 130,
            render: (item: Item) => (
                <Group gap="xs">
                    <Text size="sm" lineClamp={2} c={item.active ? undefined : 'dimmed'}>{item.externalQuestionId}</Text>
                    {!item.active && (
                        <Badge size="xs" color="gray" variant="filled">Inactive</Badge>
                    )}
                </Group>
            ),
        },
        {
            accessor: 'module.name',
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
                <Badge color={getBloomColor(item.bloom)} variant='light' size="md">
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
                        <VisuallyHidden>Edit quiz</VisuallyHidden>
                        <IconEdit size={16} />
                    </ActionIcon>
                </Group>
            )
        }
    ]

    const expandedRowContent = ({ record }: { record: Item }) => (
        <Box p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Text fw={500} mb="sm">Question Options:</Text>
            <Flex direction="row" gap="sm">
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
                            <Group gap="xs" align="center">
                                <Text fw={500} size="sm">
                                    Option {option.label}
                                </Text>
                                {option.isCorrect && (
                                    <Badge size="sm" color="green" variant='light'>
                                        Correct
                                    </Badge>
                                )}
                            </Group>
                        </Group>
                        <Text size="sm" mb="xs">{option.text}</Text>
                        {option.justification && (
                            <Text size="xs" fs="italic">
                                Justification: {option.justification}
                            </Text>
                        )}
                    </Box>
                ))}
            </Flex>
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
                selectionCheckboxProps={{
                    'aria-label': 'Select row',
                }}
                records={paginatedItems}
                columns={columns}
                sortStatus={sortStatus}
                onSortStatusChange={handleSortStatusChange}
                selectedRecords={selectedRecords}
                onSelectedRecordsChange={setSelectedRecords}
                rowExpansion={{
                    content: expandedRowContent
                }}
                rowStyle={(record: Item) =>
                    !record.active ? { opacity: 0.5, backgroundColor: '#f5f5f5' } : undefined
                }
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
                idAccessor="id"
            />

            <EditQuestionModal
                item={editingItem}
                opened={editModalOpened}
                onClose={() => {
                    setEditModalOpened(false)
                    setEditingItem(null)
                }}
                onSave={() => {
                    if (onRefresh) {
                        onRefresh()
                    }
                }}
            />
        </>
    )
}
