'use client'

import { Paper, Title, Text } from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useMemo } from 'react'

interface AttemptData {
    startedAt: string
}

interface AttemptsOverTimeChartProps {
    attempts: AttemptData[]
}

export const AttemptsOverTimeChart = ({ attempts }: AttemptsOverTimeChartProps) => {
    const attemptsOverTimeData = useMemo(() => {
        if (!attempts || attempts.length === 0) return []

        // Group attempts by date (using local date, not UTC)
        const dateMap = new Map<string, number>()

        attempts.forEach(attempt => {
            const date = new Date(attempt.startedAt)
            // Use local date string (YYYY-MM-DD) for consistent date handling
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
        })

        // Generate array of past 7 days (using local time)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset to start of day

        const past7Days: Array<{ date: string; count: number }> = []

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)

            // Create date key using local date
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`

            // Format for display
            const displayDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            })

            past7Days.push({
                date: displayDate,
                count: dateMap.get(dateKey) || 0
            })
        }

        return past7Days
    }, [attempts])

    return (
        <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Attempts Over Time</Title>
            {attemptsOverTimeData.length > 0 ? (
                <BarChart
                    h={300}
                    data={attemptsOverTimeData}
                    dataKey="date"
                    series={[{ name: 'count', color: 'green.6', label: 'Number of Attempts' }]}
                    tickLine="y"
                    withLegend
                />
            ) : (
                <Text c="dimmed" ta="center" py="xl">No data available</Text>
            )}
        </Paper>
    )
}

