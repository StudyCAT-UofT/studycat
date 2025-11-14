'use client'

import { Paper, Title, Text } from '@mantine/core'
import { BarChart } from '@mantine/charts'
import { useMemo } from 'react'

interface AttemptData {
    score: number
}

interface ScoreDistributionChartProps {
    attempts: AttemptData[]
}

export const ScoreDistributionChart = ({ attempts }: ScoreDistributionChartProps) => {
    const scoreDistributionData = useMemo(() => {
        if (!attempts || attempts.length === 0) return []

        // Create bins: 0-9, 10-19, 20-29, ..., 90-99, 100
        const bins: Array<{ min: number; max: number; label: string }> = []

        // Create bins from 0-9 up to 90-99
        for (let i = 0; i < 10; i++) {
            bins.push({
                min: i * 10,
                max: i * 10 + 9,
                label: `${i * 10}-${i * 10 + 9}`
            })
        }

        // Add the 100 bin separately
        bins.push({
            min: 100,
            max: 100,
            label: '100'
        })

        const distribution = bins.map(bin => {
            const count = attempts.filter(
                a => a.score >= bin.min && a.score <= bin.max
            ).length
            return {
                range: bin.label,
                count
            }
        })

        return distribution
    }, [attempts])

    return (
        <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Score Distribution</Title>
            {scoreDistributionData.length > 0 ? (
                <BarChart
                    h={300}
                    data={scoreDistributionData}
                    dataKey="range"
                    series={[{ name: 'count', color: 'blue.6', label: 'Number of Students' }]}
                    tickLine="y"
                    withLegend
                />
            ) : (
                <Text c="dimmed" ta="center" py="xl">No data available</Text>
            )}
        </Paper>
    )
}

