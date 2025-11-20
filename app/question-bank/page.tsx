'use client'

import { Container, Stack, Title, Group, TextInput, MultiSelect, Button, Card, Flex, Modal, Text, Box } from '@mantine/core'
import { IconSearch, IconFilter, IconX, IconPlus, IconTrash, IconUpload } from '@tabler/icons-react'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Item } from '@/types'
import { QuestionBankTable } from '@/components/Tables'
import { EditQuestionModal } from '@/components/Modals'


const QuestionBankContent = () => {
    const { selectedCourseOffering } = useCourse()
    const router = useRouter()
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedModules, setSelectedModules] = useState<string[]>([])
    const [selectedBlooms, setSelectedBlooms] = useState<string[]>([])
    const [showFilters, setShowFilters] = useState(false)

    // Modal state
    const [isNewQuestionModalOpen, setIsNewQuestionModalOpen] = useState(false)

    // Selection and delete state
    const [selectedRecords, setSelectedRecords] = useState<Item[]>([])
    const [deleteModalOpened, setDeleteModalOpened] = useState(false)
    const [deletingItems, setDeletingItems] = useState<Item[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchItems = useCallback(async () => {
        if (!selectedCourseOffering?.course?.id) {
            setItems([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/items?courseId=${selectedCourseOffering.course.id}`, {
                credentials: 'include'
            })
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
    }, [selectedCourseOffering?.course?.id])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    // Get unique modules and blooms for filter options
    const uniqueModules = useMemo(() => {
        return Array.from(new Set(items.map(item => item.module.name))).sort()
    }, [items])

    const uniqueBlooms = useMemo(() => {
        return Array.from(new Set(items.map(item => item.bloom))).sort()
    }, [items])

    // Filter items based on search and filter criteria
    const filteredItems = useMemo(() => {
        let filtered = items

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(item =>
                item.externalQuestionId.toLowerCase().includes(query) ||
                item.module.name.toLowerCase().includes(query) ||
                item.bloom.toLowerCase().includes(query) ||
                item.stem.toLowerCase().includes(query) ||
                item.reference?.toLowerCase().includes(query)
            )
        }

        // Module filter
        if (selectedModules.length > 0) {
            filtered = filtered.filter(item => selectedModules.includes(item.module.name))
        }

        // Bloom taxonomy filter
        if (selectedBlooms.length > 0) {
            filtered = filtered.filter(item => selectedBlooms.includes(item.bloom))
        }

        return filtered
    }, [items, searchQuery, selectedModules, selectedBlooms])

    const clearFilters = () => {
        setSearchQuery('')
        setSelectedModules([])
        setSelectedBlooms([])
    }

    const hasActiveFilters = searchQuery.trim() || selectedModules.length > 0 || selectedBlooms.length > 0

    const handleDeleteSelected = (items: Item[]) => {
        setDeletingItems(items)
        setDeleteModalOpened(true)
    }

    const handleDeleteConfirm = async () => {
        if (deletingItems.length === 0) return

        setIsDeleting(true)
        try {
            const response = await fetch('/api/items', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: deletingItems.map(item => item.id)
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to delete items')
            }

            // Clear selection and close modal
            setSelectedRecords([])
            setDeletingItems([])
            setDeleteModalOpened(false)

            // Refresh the data
            fetchItems()
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
                    <Title order={2}>Question Bank</Title>
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
                            variant="outline"
                            leftSection={<IconUpload size={16} />}
                            onClick={() => router.push('/upload')}
                            disabled={!selectedCourseOffering?.course?.id}
                        >
                            Upload Questions
                        </Button>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={() => setIsNewQuestionModalOpen(true)}
                            disabled={!selectedCourseOffering?.course?.id}
                        >
                            New Question
                        </Button>
                    </Group>
                </Group>

                {/* Search Bar */}
                <Card withBorder padding="md">
                    <Stack gap="md">
                        <Flex gap="md" align="end">
                            <TextInput
                                placeholder="Search questions by ID, module, bloom taxonomy, stem, or reference..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                leftSection={<IconSearch size={16} />}
                                rightSection={
                                    searchQuery ? (
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={() => setSearchQuery('')}
                                        >
                                            <IconX size={12} />
                                        </Button>
                                    ) : null
                                }
                                style={{ flex: 1 }}
                            />
                            <Button
                                variant={showFilters ? 'filled' : 'outline'}
                                leftSection={<IconFilter size={16} />}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                Filters
                            </Button>
                        </Flex>

                        {/* Filter Controls */}
                        {showFilters && (
                            <Flex gap="md" wrap="wrap">
                                <MultiSelect
                                    placeholder="Filter by modules"
                                    data={uniqueModules.map(module => ({ value: module, label: module }))}
                                    value={selectedModules}
                                    onChange={setSelectedModules}
                                    clearable
                                    style={{ minWidth: 240 }}
                                />
                                <MultiSelect
                                    placeholder="Filter by Bloom's taxonomy"
                                    data={uniqueBlooms}
                                    value={selectedBlooms}
                                    onChange={setSelectedBlooms}
                                    clearable
                                    style={{ minWidth: 240 }}
                                />
                                {hasActiveFilters && (
                                    <Button
                                        variant="subtle"
                                        color="gray"
                                        onClick={clearFilters}
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </Flex>
                        )}
                    </Stack>
                </Card>

                <QuestionBankTable
                    items={filteredItems}
                    loading={loading}
                    error={error}
                    onRefresh={fetchItems}
                    selectedRecords={selectedRecords}
                    onSelectedRecordsChange={setSelectedRecords}
                />

                {/* New Question Modal */}
                <EditQuestionModal
                    item={null}
                    opened={isNewQuestionModalOpen}
                    onClose={() => setIsNewQuestionModalOpen(false)}
                    onSave={fetchItems}
                    isCreating={true}
                    courseId={selectedCourseOffering?.course?.id}
                />

                {/* Delete Confirmation Modal */}
                <Modal
                    opened={deleteModalOpened}
                    onClose={() => setDeleteModalOpened(false)}
                    title="Delete Questions"
                    centered
                >
                    <Text mb="md">
                        Are you sure you want to delete {deletingItems.length} selected question{deletingItems.length > 1 ? 's' : ''}?
                        This action cannot be undone.
                    </Text>

                    <Box mb="md">
                        <Text size="sm" fw={500} mb="xs">Selected questions:</Text>
                        <Box style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {deletingItems.map((item, index) => (
                                <Text key={item.id} size="sm" c="dimmed">
                                    {index + 1}. {item.externalQuestionId} - {item.stem.substring(0, 50)}{item.stem.length > 50 ? '...' : ''}
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
