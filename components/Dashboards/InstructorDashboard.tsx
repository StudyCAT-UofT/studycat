'use client'

import { useCourse } from "@/lib/course-context"
import { Container, Stack, Title, Card, Group, Button, Text, SimpleGrid, Loader, Center } from "@mantine/core"
import { LineChart, RadarChart } from "@mantine/charts"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface DashboardStats {
    metrics: {
        averageQuizScore: number | null
        averageTimeMinutes: number | null
        studentsAttemptedPercent: number
    }
    charts: {
        timeSeries: Array<{ date: string; percentCorrect: number }>
        byModule: Array<{ module: string; percentCorrect: number }>
    }
}

const InstructorDashboard = () => {
    const { selectedCourseOffering } = useCourse()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = useCallback(async () => {
        if (!selectedCourseOffering?.id) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/dashboard/stats?courseOfferingId=${selectedCourseOffering.id}`, {
                credentials: 'include'
            })
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats')
            }
            const data = await response.json()
            setStats(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats')
        } finally {
            setLoading(false)
        }
    }, [selectedCourseOffering?.id])

    useEffect(() => {
        fetchStats()
    }, [fetchStats])

    if (loading) {
        return (
            <Container size="xl" py="xl">
                <Center h={400}>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading dashboard...</Text>
                    </Stack>
                </Center>
            </Container>
        )
    }

    if (error) {
        return (
            <Container size="xl" py="xl">
                <Card withBorder padding="lg" radius="md">
                    <Text c="red">{error}</Text>
                </Card>
            </Container>
        )
    }

    const formatNumber = (value: number | null, decimals: number = 1): string => {
        if (value === null || value === undefined) return 'N/A'
        return value.toFixed(decimals)
    }

    const formatTime = (minutes: number | null): string => {
        if (minutes === null || minutes === undefined) return 'N/A'
        if (minutes < 60) {
            return `${formatNumber(minutes, 1)} min`
        }
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h ${mins}m`
    }

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Group justify="space-between" align="center">
                    <Title order={2}>Dashboard</Title>
                    <Group gap="md">
                        <Button
                            variant="filled"
                            onClick={() => router.push('/quizzes')}
                        >
                            View Quizzes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/question-bank')}
                        >
                            Question Bank
                        </Button>
                    </Group>
                </Group>

                {/* Single Metric Widgets */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="xs">
                            <Text size="sm" c="dimmed">Average Quiz Score</Text>
                            <Text size="xl" fw={700}>
                                {stats && stats.metrics.averageQuizScore !== null
                                    ? `${formatNumber(stats.metrics.averageQuizScore, 2)}%`
                                    : 'N/A'}
                            </Text>
                        </Stack>
                    </Card>

                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="xs">
                            <Text size="sm" c="dimmed">Average Time per Quiz</Text>
                            <Text size="xl" fw={700}>
                                {formatTime(stats?.metrics.averageTimeMinutes ?? null)}
                            </Text>
                        </Stack>
                    </Card>

                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="xs">
                            <Text size="sm" c="dimmed">% Students Attempted</Text>
                            <Text size="xl" fw={700}>
                                {formatNumber(stats?.metrics.studentsAttemptedPercent ?? 0, 2)}%
                            </Text>
                        </Stack>
                    </Card>
                </SimpleGrid>

                {/* Graph Widgets */}
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* Line Graph: % Correct Over Time */}
                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="md">
                            <Title order={4}>% Correct Responses Over Time</Title>
                            {stats && stats.charts.timeSeries.length > 0 ? (
                                <LineChart
                                    h={300}
                                    data={stats.charts.timeSeries}
                                    dataKey="date"
                                    series={[
                                        {
                                            name: 'percentCorrect',
                                            label: '% Correct',
                                            color: 'blue',
                                        },
                                    ]}
                                    curveType="monotone"
                                    withDots={false}
                                    withLegend={false}
                                    withTooltip
                                    xAxisProps={{
                                        tickFormatter: (value) => {
                                            const date = new Date(value)
                                            return `${date.getMonth() + 1}/${date.getDate()}`
                                        },
                                    }}
                                    yAxisProps={{
                                        domain: [0, 100],
                                        tickFormatter: (value) => `${value}%`,
                                    }}
                                />
                            ) : (
                                <Center h={300}>
                                    <Text c="dimmed">No data available</Text>
                                </Center>
                            )}
                        </Stack>
                    </Card>

                    {/* Radar Chart: % Correct by Module */}
                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="md">
                            <Title order={4}>% Correct Responses by Topic</Title>
                            {stats && stats.charts.byModule.length > 0 ? (
                                <RadarChart
                                    h={300}
                                    data={stats.charts.byModule}
                                    dataKey="module"
                                    series={[
                                        {
                                            name: 'percentCorrect',
                                            label: '% Correct',
                                            color: 'blue',
                                        },
                                    ]}
                                    withPolarGrid
                                    withPolarAngleAxis
                                    withPolarRadiusAxis
                                    withTooltip
                                    polarRadiusAxisProps={{
                                        // angle: 90,
                                        domain: [0, 100],
                                        tickFormatter: (value) => `${value}%`,
                                    }}
                                />
                            ) : (
                                <Center h={300}>
                                    <Text c="dimmed">No data available</Text>
                                </Center>
                            )}
                        </Stack>
                    </Card>
                </SimpleGrid>
            </Stack>
        </Container>
    )
}

export default InstructorDashboard