'use client'

import { Paper, Title, Text } from '@mantine/core'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { useMemo } from 'react'
import { QuestionData } from '@/types'

interface ModulePerformanceRadarChartProps {
    questions: QuestionData[]
}

export const ModulePerformanceRadarChart = ({ questions }: ModulePerformanceRadarChartProps) => {
    const modulePerformanceData = useMemo(() => {
        if (!questions || questions.length === 0) return []

        // Group questions by module and calculate average % correct
        const moduleMap = new Map<string, { total: number; sum: number }>()

        questions.forEach(question => {
            const moduleName = question.moduleName || 'Unassigned'
            const current = moduleMap.get(moduleName) || { total: 0, sum: 0 }
            moduleMap.set(moduleName, {
                total: current.total + 1,
                sum: current.sum + question.average
            })
        })

        // Convert to array format for radar chart
        const data = Array.from(moduleMap.entries())
            .map(([moduleName, stats]) => ({
                module: moduleName,
                percentage: stats.total > 0 ? (stats.sum / stats.total) * 100 : 0
            }))
            .sort((a, b) => a.module.localeCompare(b.module))

        return data
    }, [questions])

    // Format data for recharts RadarChart
    const chartData = useMemo(() => {
        if (modulePerformanceData.length === 0) return []

        // Create data points for radar chart
        return modulePerformanceData.map(item => ({
            module: item.module,
            '% Correct': Number(item.percentage.toFixed(1))
        }))
    }, [modulePerformanceData])

    return (
        <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Performance by Module</Title>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={chartData}>
                        <PolarGrid />
                        <PolarAngleAxis 
                            dataKey="module" 
                            tick={{ fontSize: 12 }}
                        />
                        <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 100]}
                            tick={{ fontSize: 10 }}
                            label={{ value: '% Correct', position: 'insideStart', offset: 10 }}
                        />
                        <Tooltip 
                            formatter={(value: number) => [`${value.toFixed(1)}%`, '% Correct']}
                            labelFormatter={(label: string) => `Module: ${label}`}
                        />
                        <Radar
                            name="% Correct"
                            dataKey="% Correct"
                            stroke="#228be6"
                            fill="#228be6"
                            fillOpacity={0.6}
                        />
                        <Legend />
                    </RadarChart>
                </ResponsiveContainer>
            ) : (
                <Text c="dimmed" ta="center" py="xl">No module data available</Text>
            )}
        </Paper>
    )
}

