'use client'

import { QuizItem } from '@/types'
import { Card, Stack, Title, Button, Radio, Text, Paper } from '@mantine/core'
import { useState } from 'react'

interface Feedback {
    correctAnswerIndex: number
    selectedAnswerIndex: number
    isCorrect: boolean
    justification: string | null
}

interface QuizQuestionProps {
    item: QuizItem
    onAnswer: (answerIndex: number) => void
    onNext?: () => void
    feedback?: Feedback | null
}

const QuizQuestion = ({ item, onAnswer, onNext, feedback }: QuizQuestionProps) => {
    const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null)
    const isFeedbackMode = feedback !== null && feedback !== undefined
    const selectedIndex = isFeedbackMode ? feedback.selectedAnswerIndex : userSelectedIndex

    const handleSubmit = () => {
        if (userSelectedIndex !== null && !isFeedbackMode) {
            onAnswer(userSelectedIndex)
            setUserSelectedIndex(null) // Reset after submission
        }
    }

    const handleNext = () => {
        if (onNext) {
            onNext()
        }
    }

    const getOptionColor = (index: number) => {
        if (!isFeedbackMode) return undefined

        if (index === feedback.correctAnswerIndex) {
            return 'green'
        }
        if (index === feedback.selectedAnswerIndex && !feedback.isCorrect) {
            return 'red'
        }
        return undefined
    }

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
                <Title order={3}>{item.stem}</Title>

                <Radio.Group
                    value={selectedIndex?.toString() || ''}
                    onChange={(value) => !isFeedbackMode && setUserSelectedIndex(parseInt(value))}
                    name={`question-${item.item_id}`}
                >
                    <Stack gap="md" mt="md">
                        {item.options.map((option, index) => {
                            const color = getOptionColor(index)
                            return (
                                <Paper
                                    key={index}
                                    p="sm"
                                    radius="md"
                                    style={{
                                        backgroundColor: color === 'green' ? 'rgba(34, 197, 94, 0.1)' :
                                            color === 'red' ? 'rgba(239, 68, 68, 0.1)' :
                                                'transparent',
                                        border: color ? `2px solid ${color === 'green' ? '#22c55e' : '#ef4444'}` : 'none'
                                    }}
                                >
                                    <Radio
                                        value={index.toString()}
                                        label={option}
                                        size="md"
                                        disabled={isFeedbackMode}
                                    />
                                </Paper>
                            )
                        })}
                    </Stack>
                </Radio.Group>

                {isFeedbackMode && feedback.justification && (
                    <Paper p="md" radius="md" bg="gray.0" mt="md">
                        <Text size="sm" fw={500} mb="xs">
                            Feedback:
                        </Text>
                        <Text size="sm">{feedback.justification}</Text>
                    </Paper>
                )}

                {!isFeedbackMode ? (
                    <Button
                        variant="filled"
                        onClick={handleSubmit}
                        disabled={selectedIndex === null}
                        fullWidth
                        mt="lg"
                    >
                        Submit Answer
                    </Button>
                ) : (
                    <Button
                        variant="filled"
                        onClick={handleNext}
                        fullWidth
                        mt="lg"
                    >
                        Next
                    </Button>
                )}
            </Stack>
        </Card>
    )
}

export default QuizQuestion
