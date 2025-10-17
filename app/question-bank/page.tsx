'use client'

import { Container, Stack, Title, Badge, Group } from '@mantine/core'
import { ProtectedRoute, RoleBasedRoute, QuestionBankTable } from '@/components'
import { useCourse } from '@/lib/course-context'
import { useEffect, useState } from 'react'

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

    useEffect(() => {
        const fetchItems = async () => {
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
        }

        fetchItems()
    }, [selectedCourseOffering?.course?.id])

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group gap="md" align="center">
                    <Title order={2}>Question Bank</Title>
                    {!loading && !error && (
                        <Badge size="lg" variant="light">
                            {items.length} question{items.length !== 1 ? 's' : ''}
                        </Badge>
                    )}
                </Group>

                <QuestionBankTable items={items} loading={loading} error={error} />
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
