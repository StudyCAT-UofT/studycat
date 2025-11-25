'use client'

import { useState, useMemo } from 'react'
import { Text, Badge, Group } from '@mantine/core'
import { DataTable, DataTableSortStatus } from 'mantine-datatable'

interface Student {
    id: string
    userId: string
    username: string
    givenName: string
    familyName: string
    enrolledAt: string
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
}

export const StudentsTable = ({
    students,
    loading,
    error,
    selectedRecords: externalSelectedRecords,
    onSelectedRecordsChange
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

    // Sort the students based on the current sort status
    const sortedStudents = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
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

    const columns = [
        {
            accessor: 'familyName',
            title: 'Family Name',
            sortable: true,
            width: 150,
            render: (student: Student) => (
                <Text size="sm" fw={500}>
                    {student.familyName || '—'}
                </Text>
            )
        },
        {
            accessor: 'givenName',
            title: 'Given Name',
            sortable: true,
            width: 150,
            render: (student: Student) => (
                <Text size="sm" fw={500}>
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
                <Text size="sm">
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
                <Text size="sm">
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
                <Text size="sm">
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
                            color={getScoreColor(student.averageScore)}
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
                <Text size="sm">
                    {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : '—'}
                </Text>
            )
        }
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

