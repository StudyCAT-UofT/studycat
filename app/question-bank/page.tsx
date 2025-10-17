'use client'

import { Container, Stack, Title, Group, TextInput, MultiSelect, Button, Card, Flex } from '@mantine/core'
import { IconSearch, IconFilter, IconX, IconPlus } from '@tabler/icons-react'
import { ProtectedRoute, RoleBasedRoute, QuestionBankTable, EditQuestionModal } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState, useMemo, useCallback } from 'react'

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

const QuestionBankContent = () => {
    const { selectedCourseOffering } = useCourse()
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

    const fetchItems = useCallback(async () => {
        if (!selectedCourseOffering?.course?.id) {
            setItems([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/items?courseId=${selectedCourseOffering.course.id}`)
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
        return Array.from(new Set(items.map(item => item.module))).sort()
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
                item.module.toLowerCase().includes(query) ||
                item.bloom.toLowerCase().includes(query) ||
                item.stem.toLowerCase().includes(query) ||
                item.reference?.toLowerCase().includes(query)
            )
        }

        // Module filter
        if (selectedModules.length > 0) {
            filtered = filtered.filter(item => selectedModules.includes(item.module))
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

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center" justify="space-between">
                    <Title order={2}>Question Bank</Title>
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setIsNewQuestionModalOpen(true)}
                        disabled={!selectedCourseOffering?.course?.id}
                    >
                        New Question
                    </Button>
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
                                    data={uniqueModules}
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
