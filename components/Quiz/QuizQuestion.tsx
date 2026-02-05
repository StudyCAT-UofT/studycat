'use client'

import { QuizItem, Feedback } from '@/types'
import { Card, Stack, Title, Button, Radio, Text, Paper, Image, Flex } from '@mantine/core'
import { useState } from 'react'

interface QuizQuestionProps {
    item: QuizItem
    onAnswer: (answerIndex: number) => void
    onNext?: () => void
    feedback?: Feedback | null
}

const QuizQuestion = ({ item, onAnswer, onNext, feedback }: QuizQuestionProps) => {
    const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null)
    const [submittedDisplayIndex, setSubmittedDisplayIndex] = useState<number | null>(null)
    const isFeedbackMode = feedback !== null && feedback !== undefined
    const figureUrl = typeof item.figure_url === 'string' && item.figure_url.trim().length > 0
        ? item.figure_url.trim()
        : null
    const reference = typeof item.reference === 'string' && item.reference.trim().length > 0
        ? item.reference.trim()
        : null

    // Shuffle options 
    const [shuffledIndices] = useState(() => {
    const indices = item.options.map((_, i) => i)
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }
        return indices
    })

    const handleSubmit = () => {
        if (userSelectedIndex !== null && !isFeedbackMode) {
            // Map the selected display index back to the original option index
            const actualIndex = shuffledIndices[userSelectedIndex]
            onAnswer(actualIndex)
            setSubmittedDisplayIndex(userSelectedIndex)
            setUserSelectedIndex(null)
        }
    }

    const selectedIndex = isFeedbackMode
        ? shuffledIndices.findIndex(i => i === feedback.selectedAnswerIndex)
        : submittedDisplayIndex ?? userSelectedIndex

    const handleNext = () => {
        if (onNext) {
            onNext()
        }
    }

    const getOptionColor = (index: number) => {
        if (!isFeedbackMode) return undefined

        const actualIndex = shuffledIndices[index]

        if (actualIndex === feedback.correctAnswerIndex) return 'green'
        if (actualIndex === feedback.selectedAnswerIndex && !feedback.isCorrect) return 'red'
        return undefined
    }

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
                <Title order={3}>{item.stem}</Title>

                {figureUrl && (
                    <Flex mah="500px" justify="center">
                        <Image
                            src={figureUrl}
                            alt="Question illustration"
                            w="auto"
                            fit="contain"
                        />
                    </Flex>
                )}

                <Radio.Group
                    value={selectedIndex?.toString() || ''}
                    onChange={(value) => !isFeedbackMode && setUserSelectedIndex(parseInt(value))}
                    name={`question-${item.item_id}`}
                >
                    <Stack gap="md" mt="md">
                        {shuffledIndices.map((shuffledIndex, displayIndex) => {
                            const option = item.options[shuffledIndex]
                            const color = getOptionColor(displayIndex)

                            return (
                                <Paper
                                    key={displayIndex}
                                    p="sm"
                                    radius="md"
                                    style={{
                                        backgroundColor:
                                            color === 'green'
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : color === 'red'
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : 'transparent',
                                        border: color ? `2px solid ${color === 'green' ? '#22c55e' : '#ef4444'}` : 'none'
                                    }}
                                >
                                    <Radio value={displayIndex.toString()} label={option} size="md" disabled={isFeedbackMode} />
                                </Paper>
                            )
                        })}
                    </Stack>
                </Radio.Group>

                {isFeedbackMode && (feedback.justification || reference) && (
                    <Paper p="md" radius="md" bg="gray.0" mt="md">
                        <Stack gap="md">
                            {feedback.justification && (
                                <>
                                    <Text size="sm" fw={500}>
                                        Feedback:
                                    </Text>
                                    <Text size="sm">{feedback.justification}</Text>
                                </>
                            )}
                            {reference && (
                                <>
                                    <Text size="sm" fw={500}>
                                        Reference:
                                    </Text>
                                    <Text size="sm">{reference}</Text>
                                </>
                            )}
                        </Stack>
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
