'use client'

import { Container, Stack, Title, Badge, Group, Button, Modal, Text, Box } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { IconPlus, IconTrash, IconEyeOff, IconEye } from '@tabler/icons-react'
import { AddStudentsModal } from '@/components/Modals'
import { StudentsTable } from '@/components/Tables'

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

/**
 * Main content component for the students page
 * Displays a table of students for the selected course offering
 */
const StudentsContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal state
    const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false)

    // Selection and delete state
    const [selectedRecords, setSelectedRecords] = useState<Student[]>([])
    const [deleteModalOpened, setDeleteModalOpened] = useState(false)
    const [deletingStudents, setDeletingStudents] = useState<Student[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    // Hide state
    const [hideModalOpened, setHideModalOpened] = useState(false)
    const [hidingStudents, setHidingStudents] = useState<Student[]>([])
    const [isHiding, setIsHiding] = useState(false)

    /**
     * Fetches students for the selected course offering
     * Resets state when course offering changes
     */
    const fetchStudents = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setStudents([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/students?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch students')
            }
            const data = await response.json()
            setStudents(data.students || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch students')
            setStudents([])
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    // Fetch students when course offering changes
    useEffect(() => {
        fetchStudents()
    }, [fetchStudents])

    /**
     * Memoized student count display — shows visible count and hidden count when applicable
     */
    const studentCountText = useMemo(() => {
        if (loading || error) return null
        const hiddenCount = students.filter(s => s.hidden).length
        const visibleCount = students.length - hiddenCount
        if (hiddenCount > 0) {
            return `${visibleCount} student${visibleCount !== 1 ? 's' : ''} (${hiddenCount} hidden)`
        }
        return `${students.length} student${students.length !== 1 ? 's' : ''}`
    }, [students, loading, error])

    const handleDeleteSelected = (students: Student[]) => {
        setDeletingStudents(students)
        setDeleteModalOpened(true)
    }

    const handleDeleteConfirm = async () => {
        if (deletingStudents.length === 0) return

        setIsDeleting(true)
        try {
            // Delete enrollments (students are enrollments with STUDENT role)
            const response = await fetch('/api/enrollments', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    enrollmentIds: deletingStudents.map(student => student.id)
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete students')
            }

            // Clear selection and close modal
            setSelectedRecords([])
            setDeletingStudents([])
            setDeleteModalOpened(false)

            // Refresh the data
            fetchStudents()
        } catch (error) {
            console.error('Delete error:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    /**
     * Opens the hide confirmation modal for selected visible students
     */
    const handleHideSelected = (students: Student[]) => {
        setHidingStudents(students.filter(s => !s.hidden))
        setHideModalOpened(true)
    }

    /**
     * Confirms and executes the bulk hide action
     */
    const handleHideConfirm = async () => {
        if (hidingStudents.length === 0) return

        setIsHiding(true)
        try {
            const response = await fetch('/api/enrollments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    enrollmentIds: hidingStudents.map(s => s.id),
                    hidden: true,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to hide students')
            }

            setSelectedRecords([])
            setHidingStudents([])
            setHideModalOpened(false)
            fetchStudents()
        } catch (error) {
            console.error('Hide error:', error)
        } finally {
            setIsHiding(false)
        }
    }

    /**
     * Immediately unhides selected hidden students (no confirmation needed — reversible)
     */
    const handleUnhideSelected = async (students: Student[]) => {
        const toUnhide = students.filter(s => s.hidden)
        if (toUnhide.length === 0) return

        try {
            const response = await fetch('/api/enrollments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    enrollmentIds: toUnhide.map(s => s.id),
                    hidden: false,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to unhide students')
            }

            setSelectedRecords([])
            fetchStudents()
        } catch (error) {
            console.error('Unhide error:', error)
        }
    }

    /**
     * Per-row hide/unhide toggle (immediate, no confirmation)
     */
    const handleToggleHidden = async (enrollmentId: string, hidden: boolean) => {
        try {
            const response = await fetch('/api/enrollments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enrollmentIds: [enrollmentId], hidden }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update student visibility')
            }

            fetchStudents()
        } catch (error) {
            console.error('Toggle hidden error:', error)
        }
    }

    const selectedVisibleCount = selectedRecords.filter(s => !s.hidden).length
    const selectedHiddenCount = selectedRecords.filter(s => s.hidden).length

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center" justify="space-between">
                    <Group gap="md" align="center">
                        <Title order={2}>Students</Title>
                        {studentCountText && (
                            <Badge size="lg" variant="light">
                                {studentCountText}
                            </Badge>
                        )}
                    </Group>
                    <Group gap="sm">
                        {selectedHiddenCount > 0 && (
                            <Button
                                color="blue"
                                variant="light"
                                leftSection={<IconEye size={16} />}
                                onClick={() => handleUnhideSelected(selectedRecords)}
                                disabled={loading}
                            >
                                Unhide Selected ({selectedHiddenCount})
                            </Button>
                        )}
                        {selectedVisibleCount > 0 && (
                            <Button
                                color="gray"
                                variant="light"
                                leftSection={<IconEyeOff size={16} />}
                                onClick={() => handleHideSelected(selectedRecords)}
                                disabled={loading}
                            >
                                Hide Selected ({selectedVisibleCount})
                            </Button>
                        )}
                        {selectedRecords.length > 0 && (
                            <Button
                                color="red"
                                variant="light"
                                leftSection={<IconTrash size={16} />}
                                onClick={() => handleDeleteSelected(selectedRecords)}
                                disabled={loading}
                            >
                                Delete Selected ({selectedRecords.length})
                            </Button>
                        )}
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => setIsAddStudentsModalOpen(true)}
                            disabled={!selectedCourseOffering?.id}
                        >
                            Add Students
                        </Button>
                    </Group>
                </Group>

                <StudentsTable
                    students={students}
                    loading={loading}
                    error={error}
                    selectedRecords={selectedRecords}
                    onSelectedRecordsChange={setSelectedRecords}
                    onToggleHidden={handleToggleHidden}
                />

                {/* Add Students Modal */}
                <AddStudentsModal
                    opened={isAddStudentsModalOpen}
                    onClose={() => setIsAddStudentsModalOpen(false)}
                    onSave={fetchStudents}
                />

                {/* Delete Confirmation Modal */}
                <Modal
                    opened={deleteModalOpened}
                    onClose={() => setDeleteModalOpened(false)}
                    title="Remove Students"
                    centered
                >
                    <Text mb="md">
                        Are you sure you want to remove {deletingStudents.length} selected student{deletingStudents.length > 1 ? 's' : ''} from this course offering?
                        This will remove their enrollment but will not delete their user accounts. This action cannot be undone.
                    </Text>

                    <Box mb="md">
                        <Text size="sm" fw={500} mb="xs">Selected students:</Text>
                        <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {deletingStudents.map((student, index) => (
                                <Text key={student.id} size="sm" c="dimmed">
                                    {index + 1}. {student.username}
                                </Text>
                            ))}
                        </Box>
                    </Box>

                    <Group justify="flex-end">
                        <Button
                            variant="light"
                            onClick={() => setDeleteModalOpened(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            onClick={handleDeleteConfirm}
                            loading={isDeleting}
                        >
                            Remove
                        </Button>
                    </Group>
                </Modal>

                {/* Hide Confirmation Modal */}
                <Modal
                    opened={hideModalOpened}
                    onClose={() => setHideModalOpened(false)}
                    title="Hide Students"
                    centered
                >
                    <Text mb="md">
                        Hide {hidingStudents.length} student{hidingStudents.length !== 1 ? 's' : ''} from this course?
                        Hidden students will be excluded from analytics and reports, but their data is preserved and can be restored at any time.
                    </Text>

                    <Box mb="md">
                        <Text size="sm" fw={500} mb="xs">Students to hide:</Text>
                        <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {hidingStudents.map((student, index) => (
                                <Text key={student.id} size="sm" c="dimmed">
                                    {index + 1}. {student.username}
                                </Text>
                            ))}
                        </Box>
                    </Box>

                    <Group justify="flex-end">
                        <Button
                            variant="light"
                            onClick={() => setHideModalOpened(false)}
                            disabled={isHiding}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="gray"
                            leftSection={<IconEyeOff size={16} />}
                            onClick={handleHideConfirm}
                            loading={isHiding}
                        >
                            Hide
                        </Button>
                    </Group>
                </Modal>
            </Stack>
        </Container>
    )
}

/**
 * Students page component
 *
 * Displays a comprehensive list of students for the selected course offering.
 * Includes loading states, error handling, and the ability to add/remove/hide students.
 *
 * Access Control:
 * - Requires authentication (ProtectedRoute)
 * - Restricted to instructors and TAs only (RoleBasedRoute)
 */
export default function StudentsPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access students."
            >
                <StudentsContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
