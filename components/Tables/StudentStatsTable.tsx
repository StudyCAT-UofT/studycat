'use client'

import { Paper, Title, Badge } from '@mantine/core'
import { DataTable } from 'mantine-datatable'

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
            render: (record: any) => (
                <Badge
                    color={
                        record.score >= 80 ? 'green' :
                            record.score >= 60 ? 'yellow' : 'red'
                    }
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
            <Title order={4} mb="md">Student Performance Summary</Title>
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

