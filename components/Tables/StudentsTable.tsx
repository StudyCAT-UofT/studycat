'use client'

import { useState, useMemo, useEffect } from 'react'
import { Text, Badge, Group, Button } from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'

interface Student {
    id: string
    userId: string
    username: string
    givenName: string
    familyName: string
    enrolledAt: string
    hidden: boolean
    totalAttempts: number
    averageScore: number | null
    lastActivity: string | null
}

interface StudentsTableProps {
    students: Student[]
    loading: boolean
    error: string | null
    selectedRecords?: Student[]
    onSelectedRecordsChange?: (records: Student[]) => void
    onToggleHidden?: (enrollmentId: string, hidden: boolean) => void
}

export const StudentsTable = ({
    students,
    loading,
    error,
    selectedRecords: externalSelectedRecords,
    onSelectedRecordsChange,
    onToggleHidden
}: StudentsTableProps) => {
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Student>>({
        columnAccessor: 'familyName',
        direction: 'asc'
    })

    const getScoreColor = (score: number | null) => {
        if (score === null) return 'gray'
        if (score >= 80) return 'green'
        if (score >= 60) return 'yellow'
        return 'red'
    }
    const [internalSelectedRecords, setInternalSelectedRecords] = useState<Student[]>([])

    // Use external selected records if provided, otherwise use internal state
    const selectedRecords = externalSelectedRecords !== undefined ? externalSelectedRecords : internalSelectedRecords
    const setSelectedRecords = onSelectedRecordsChange || setInternalSelectedRecords
    const [page, setPage] = useState(1)
    const [pageSize] = useState(20)

    const handleSortStatusChange = (newSortStatus: DataTableSortStatus<Student>) => {
        setSortStatus(newSortStatus)
        setPage(1) // Reset to first page when sorting changes
    }

    // Sort the students based on the current sort status; hidden students always last
    const sortedStudents = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
            // Hidden students always go to the end, regardless of sort direction
            if (a.hidden !== b.hidden) return a.hidden ? 1 : -1

            const { columnAccessor, direction } = sortStatus
            const aValue = a[columnAccessor as keyof Student]
            const bValue = b[columnAccessor as keyof Student]

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

                // If sorting by family name and values are equal, sort by given name
                if (columnAccessor === 'familyName') {
                    const aGivenName = (a.givenName || '').toLowerCase()
                    const bGivenName = (b.givenName || '').toLowerCase()
                    if (aGivenName < bGivenName) return direction === 'asc' ? -1 : 1
                    if (aGivenName > bGivenName) return direction === 'asc' ? 1 : -1
                }

                return 0
            }

            // Handle date comparison
            if (columnAccessor === 'enrolledAt' || columnAccessor === 'lastActivity') {
                const aDate = new Date(aValue as string)
                const bDate = new Date(bValue as string)
                if (aDate < bDate) return direction === 'asc' ? -1 : 1
                if (aDate > bDate) return direction === 'asc' ? 1 : -1
                return 0
            }

            // Handle numeric comparison
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
    }, [students, sortStatus])

    // Fix empty th on checkbox column
    useEffect(() => {
        const selectorTh = document.querySelector('th[data-accessor="__selection__"]')
        if (selectorTh) {
            selectorTh.setAttribute('title', 'Select rows')
            selectorTh.setAttribute('aria-label', 'Select rows')
            if (!selectorTh.querySelector('[data-sr-label]')) {
                const span = document.createElement('span')
                span.setAttribute('data-sr-label', '')
                Object.assign(span.style, {
                    display: 'inline-block',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    clip: 'rect(0 0 0 0)',
                    clipPath: 'inset(50%)',
                    whiteSpace: 'nowrap',
                })
                span.textContent = 'Select rows'
                selectorTh.appendChild(span)
            }
        }
    }, [sortedStudents])

    const columns = [
        {
            accessor: 'familyName',
            title: 'Family Name',
            sortable: true,
            width: 150,
            render: (student: Student) => (
                <Group gap={6}>
                    <Text size="sm" fw={500} c={student.hidden ? 'dimmed' : undefined}>
                        {student.familyName || '—'}
                    </Text>
                    {student.hidden && (
                        <Badge variant="light" color="gray" size="xs">
                            Hidden
                        </Badge>
                    )}
                </Group>
            )
        },
        {
            accessor: 'givenName',
            title: 'Given Name',
            sortable: true,
            width: 150,
            render: (student: Student) => (
                <Text size="sm" fw={500} c={student.hidden ? 'dimmed' : undefined}>
                    {student.givenName || '—'}
                </Text>
            )
        },
        {
            accessor: 'username',
            title: 'Username',
            sortable: true,
            width: 150,
            render: (student: Student) => (
                <Text size="sm" c={student.hidden ? 'dimmed' : undefined}>
                    {student.username}
                </Text>
            )
        },
        {
            accessor: 'enrolledAt',
            title: 'Enrolled Date',
            sortable: true,
            width: 130,
            render: (student: Student) => (
                <Text size="sm" c={student.hidden ? 'dimmed' : undefined}>
                    {new Date(student.enrolledAt).toLocaleDateString()}
                </Text>
            )
        },
        {
            accessor: 'totalAttempts',
            title: 'Total Attempts',
            sortable: true,
            width: 130,
            render: (student: Student) => (
                <Text size="sm" c={student.hidden ? 'dimmed' : undefined}>
                    {student.totalAttempts}
                </Text>
            )
        },
        {
            accessor: 'averageScore',
            title: 'Average Score',
            sortable: true,
            width: 140,
            render: (student: Student) => (
                student.averageScore !== null ? (
                    <Group gap={4}>
                        <Badge
                            variant="light"
                            color={student.hidden ? 'gray' : getScoreColor(student.averageScore)}
                            size="md"
                        >
                            {student.averageScore.toFixed(1)}%
                        </Badge>
                    </Group>
                ) : (
                    <Badge variant="light" color="gray" size="md">
                        No data
                    </Badge>
                )
            )
        },
        {
            accessor: 'lastActivity',
            title: 'Latest Attempt',
            sortable: true,
            width: 130,
            render: (student: Student) => (
                <Text size="sm" c={student.hidden ? 'dimmed' : undefined}>
                    {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : '—'}
                </Text>
            )
        },
        ...(onToggleHidden ? [{
            accessor: 'actions',
            title: '',
            width: 90,
            render: (student: Student) => (
                <Button
                    size="xs"
                    variant="subtle"
                    color='dark'
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleHidden(student.id, !student.hidden)
                    }}
                >
                    {student.hidden ? 'Unhide' : 'Hide'}
                </Button>
            )
        }] : [])
    ]

    if (error) {
        return (
            <Text c="red" size="sm">
                Error: {error}
            </Text>
        )
    }

    return (
        <DataTable
            records={sortedStudents}
            columns={columns}
            sortStatus={sortStatus}
            onSortStatusChange={handleSortStatusChange}
            selectedRecords={selectedRecords}
            onSelectedRecordsChange={setSelectedRecords}
            fetching={loading}
            minHeight={200}
            striped
            highlightOnHover
            withTableBorder
            withColumnBorders
            withRowBorders
            rowStyle={(student: Student) => student.hidden ? { opacity: 0.6 } : undefined}
            page={page}
            onPageChange={setPage}
            totalRecords={sortedStudents.length}
            recordsPerPage={pageSize}
            paginationActiveBackgroundColor="blue"
            idAccessor="id"
            noRecordsText="No students found for this course offering."
        />
    )
}
