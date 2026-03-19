'use client'

import { Paper, Title, Text } from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useMemo } from 'react'

interface AttemptData {
    startedAt: string
    status?: string
}

interface AttemptsOverTimeChartProps {
    attempts: AttemptData[]
}

export const AttemptsOverTimeChart = ({ attempts }: AttemptsOverTimeChartProps) => {
    const attemptsOverTimeData = useMemo(() => {
        if (!attempts || attempts.length === 0) return []

        // Group attempts by date, separating completed and incomplete
        const completedMap = new Map<string, number>()
        const incompleteMap = new Map<string, number>()

        attempts.forEach(attempt => {
            const date = new Date(attempt.startedAt)
            // Use local date string (YYYY-MM-DD) for consistent date handling
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const dateKey = `${year}-${month}-${day}`
            
            // Count completed vs incomplete attempts
            if (attempt.status === 'COMPLETED') {
                completedMap.set(dateKey, (completedMap.get(dateKey) || 0) + 1)
            } else {
                incompleteMap.set(dateKey, (incompleteMap.get(dateKey) || 0) + 1)
            }
        })

        // Generate array of past 7 days (using local time)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset to start of day

        const past7Days: Array<{ date: string; completed: number; incomplete: number }> = []

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

            const completed = completedMap.get(dateKey) || 0
            const incomplete = incompleteMap.get(dateKey) || 0

            past7Days.push({
                date: displayDate,
                completed,
                incomplete
            })
        }

        return past7Days
    }, [attempts])

    return (
        <Paper withBorder p="md" radius="md">
            <Title order={2} mb="md">Attempts Over Time</Title>
            {attemptsOverTimeData.length > 0 ? (
                <BarChart
                    h={300}
                    data={attemptsOverTimeData}
                    dataKey="date"
                    type="stacked"
                    series={[
                        { name: 'completed', color: 'green.6', label: 'Completed' },
                        { name: 'incomplete', color: 'orange.6', label: 'Incomplete' }
                    ]}
                    tickLine="y"
                    withLegend
                    xAxisLabel="Date"
                    yAxisLabel="Number of Attempts"
                />
            ) : (
                <Text c="dimmed" ta="center" py="xl">No data available</Text>
            )}
        </Paper>
    )
}

