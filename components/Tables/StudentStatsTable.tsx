'use client'

import { Paper, Title, Badge, Group, Tooltip, ActionIcon, VisuallyHidden } from '@mantine/core'
import { DataTable } from 'mantine-datatable'
import { IconInfoCircle } from '@tabler/icons-react'

interface AttemptData {
    userId: string
    username: string
    score: number
    questions: Array<{
        questionId: string
        stem: string
        isCorrect: boolean
    }>
    startedAt: string
}

interface StudentStatsTableProps {
    attempts: AttemptData[]
}

export const StudentStatsTable = ({ attempts }: StudentStatsTableProps) => {
    if (attempts.length === 0) {
        return null
    }

    const records = attempts
        .sort((a, b) => b.score - a.score)
        .map((attempt, index) => {
            const correctCount = attempt.questions.filter(q => q.isCorrect).length
            return {
                ...attempt,
                id: `${attempt.userId}-${attempt.startedAt}-${index}`,
                correctCount,
                totalQuestions: attempt.questions.length
            }
        })

    const columns = [
        {
            accessor: 'username',
            title: 'Username',
            sortable: true,
        },
        {
            accessor: 'score',
            title: 'Score',
            sortable: true,
            render: (record: AttemptData) => (
                <Badge
                    color={
                        record.score >= 80 ? 'green' :
                            record.score >= 60 ? 'yellow' : 'red'
                    }
                    variant='light'
                >
                    {record.score.toFixed(1)}%
                </Badge>
            )
        },
        {
            accessor: 'totalQuestions',
            title: 'Questions Answered',
            sortable: true,
        },
        {
            accessor: 'correctCount',
            title: 'Correct Answers',
            sortable: true,
        },
    ]

    return (
        <Paper withBorder p="md" radius="md">
            <Group gap="xs" mb="md" align="center">
                <Title order={2}>Student Performance Summary</Title>
                <Tooltip label="Shows completed student attempts for all time" withArrow>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                        <IconInfoCircle size={16} />
                        <VisuallyHidden>Info Button</VisuallyHidden>
                    </ActionIcon>
                </Tooltip>
            </Group>
            <DataTable
                records={records}
                columns={columns}
                minHeight={200}
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                withRowBorders
                idAccessor="id"
            />
        </Paper>
    )
}
