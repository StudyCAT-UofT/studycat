'use client'

import { Container, Stack, Title, Badge, Group, Button, Modal, Text, Box } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute, QuizzesTable, EditQuizModal } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Quiz } from '@/types'
import { IconPlus, IconTrash } from '@tabler/icons-react'


/**
 * Main content component for the quizzes page
 * Displays a table of quizzes with statistics for the selected course offering
 */
const QuizzesContent = () => {
    const { selectedCourseOffering } = useCourse()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal state
    const [isNewQuizModalOpen, setIsNewQuizModalOpen] = useState(false)
    const [isEditQuizModalOpen, setIsEditQuizModalOpen] = useState(false)
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)

    // Selection and delete state
    const [selectedRecords, setSelectedRecords] = useState<Quiz[]>([])
    const [deleteModalOpened, setDeleteModalOpened] = useState(false)
    const [deletingQuizzes, setDeletingQuizzes] = useState<Quiz[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    /**
     * Fetches quizzes for the selected course offering
     * Resets state when course offering changes
     */
    const fetchQuizzes = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setQuizzes([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/quizzes?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch quizzes')
            }
            const data = await response.json()
            setQuizzes(data.quizzes || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch quizzes')
            setQuizzes([])
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    // Fetch quizzes when course offering changes
    useEffect(() => {
        fetchQuizzes()
    }, [fetchQuizzes])

    /**
     * Memoized quiz count display text to prevent unnecessary re-renders
     */
    const quizCountText = useMemo(() => {
        if (loading || error) return null
        return `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`
    }, [quizzes.length, loading, error])

    const handleEditQuiz = (quiz: Quiz) => {
        setEditingQuiz(quiz)
        setIsEditQuizModalOpen(true)
    }

    const handleDeleteSelected = (quizzes: Quiz[]) => {
        setDeletingQuizzes(quizzes)
        setDeleteModalOpened(true)
    }

    const handleDeleteConfirm = async () => {
        if (deletingQuizzes.length === 0) return

        setIsDeleting(true)
        try {
            const response = await fetch('/api/quizzes', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: deletingQuizzes.map(quiz => quiz.id)
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete quizzes')
            }

            // Clear selection and close modal
            setSelectedRecords([])
            setDeletingQuizzes([])
            setDeleteModalOpened(false)

            // Refresh the data
            fetchQuizzes()
        } catch (error) {
            console.error('Delete error:', error)
            // You could add a notification here if needed
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center" justify="space-between">
                    <Group gap="md" align="center">
                        <Title order={2}>Quizzes</Title>
                        {quizCountText && (
                            <Badge size="lg" variant="light">
                                {quizCountText}
                            </Badge>
                        )}
                    </Group>
                    <Group gap="sm">
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
                            onClick={() => setIsNewQuizModalOpen(true)}
                            disabled={!selectedCourseOffering?.id}
                        >
                            New Quiz
                        </Button>
                    </Group>
                </Group>

                <QuizzesTable
                    quizzes={quizzes}
                    loading={loading}
                    error={error}
                    selectedRecords={selectedRecords}
                    onSelectedRecordsChange={setSelectedRecords}
                    onEditQuiz={handleEditQuiz}
                />

                {/* New Quiz Modal */}
                <EditQuizModal
                    quiz={null}
                    opened={isNewQuizModalOpen}
                    onClose={() => setIsNewQuizModalOpen(false)}
                    onSave={fetchQuizzes}
                    isCreating={true}
                />

                {/* Edit Quiz Modal */}
                <EditQuizModal
                    quiz={editingQuiz}
                    opened={isEditQuizModalOpen}
                    onClose={() => {
                        setIsEditQuizModalOpen(false)
                        setEditingQuiz(null)
                    }}
                    onSave={fetchQuizzes}
                    isCreating={false}
                />

                {/* Delete Confirmation Modal */}
                <Modal
                    opened={deleteModalOpened}
                    onClose={() => setDeleteModalOpened(false)}
                    title="Delete Quizzes"
                    centered
                >
                    <Text mb="md">
                        Are you sure you want to delete {deletingQuizzes.length} selected quiz{deletingQuizzes.length > 1 ? 'zes' : ''}?
                        All questions, attempts, and statistics associated with the quiz{deletingQuizzes.length > 1 ? 'zes' : ''} will also be deleted. This action cannot be undone.
                    </Text>

                    <Box mb="md">
                        <Text size="sm" fw={500} mb="xs">Selected quizzes:</Text>
                        <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {deletingQuizzes.map((quiz, index) => (
                                <Text key={quiz.id} size="sm" c="dimmed">
                                    {index + 1}. {quiz.title} - {quiz.fixedLength} questions
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
                            Delete
                        </Button>
                    </Group>
                </Modal>
            </Stack>
        </Container>
    )
}

/**
 * Quizzes page component
 * 
 * Displays a comprehensive list of quizzes for the selected course offering.
 * Includes statistics, loading states, and error handling.
 * 
 * Access Control:
 * - Requires authentication (ProtectedRoute)
 * - Restricted to instructors and TAs only (RoleBasedRoute)
 */
export default function QuizzesPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can access quizzes."
            >
                <QuizzesContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
