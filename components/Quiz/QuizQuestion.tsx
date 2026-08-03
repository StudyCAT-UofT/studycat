'use client'

import { QuizItem, Feedback, FeedbackLevel, feedbackLevels } from '@/types'
import { Card, Stack, Title, Button, Radio, Text, Paper, Image, Flex, Group, VisuallyHidden } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'

interface QuizQuestionProps {
    item: QuizItem
    onAnswer: (answerIndex: number) => void
    onNext?: () => void
    feedback?: Feedback | null,
    shuffled: boolean,
    feedbackVisibility: FeedbackLevel
}

const QuizQuestion = ({ item, onAnswer, onNext, feedback, shuffled, feedbackVisibility }: QuizQuestionProps) => {
    const [userSelectedIndex, setUserSelectedIndex] = useState<number | null>(null)
    const [submittedDisplayIndex, setSubmittedDisplayIndex] = useState<number | null>(null)
    const isFeedbackMode = feedback !== null && feedback !== undefined
    const figureUrl = typeof item.figure_url === 'string' && item.figure_url.trim().length > 0
        ? item.figure_url.trim()
        : null
    const reference = typeof item.reference === 'string' && item.reference.trim().length > 0
        ? item.reference.trim()
        : null

    useEffect(() => {
        setUserSelectedIndex(null)
        setSubmittedDisplayIndex(null)
    }, [item.item_id])

    // Shuffle options
    const [shuffledIndices] = useState(() => {
        const indices = item.options.map((_, i) => i)

        if (!shuffled) {
            return indices // keep original order
        }

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

        // Hide correctness if feedbackVisibility is 'none'
        if (feedbackVisibility === feedbackLevels.NONE) return undefined

        const actualIndex = shuffledIndices[index]

        if (actualIndex === feedback.correctAnswerIndex) return 'green'
        if (actualIndex === feedback.selectedAnswerIndex && !feedback.isCorrect) return 'red'
        return undefined
    }

    const stemId = `question-stem-${item.item_id}`

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
                <Title order={2} id={stemId} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.stem) }} />

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
                    label={<VisuallyHidden>{item.stem}</VisuallyHidden>}
                >
                    <Stack gap="md" mt="md">
                        {shuffledIndices.map((shuffledIndex, displayIndex) => {
                            const option = item.options[shuffledIndex]
                            const color = getOptionColor(displayIndex)
                            const actualIndex = shuffledIndices[displayIndex]
                            const isCorrectOption = isFeedbackMode && (feedbackVisibility == feedbackLevels.FULL || feedbackVisibility == feedbackLevels.NO_JUST) && actualIndex === feedback.correctAnswerIndex
                            const isWrongSelected = isFeedbackMode && (feedbackVisibility == feedbackLevels.FULL || feedbackVisibility == feedbackLevels.NO_JUST) &&  actualIndex === feedback.selectedAnswerIndex && !feedback.isCorrect

                            return (
                                <Paper
                                    key={displayIndex}
                                    p="sm"
                                    radius="md"
                                    component="label"
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
                                    <Group justify="space-between" align="center">
                                        <Group align="center" gap="sm" wrap="nowrap">
                                            <Radio value={displayIndex.toString()} size="md" disabled={isFeedbackMode} style={{ flex: 1 }} />
                                            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(option)}} />
                                        </Group>
                                        {isCorrectOption && <IconCheck size={20} color="#22c55e" />}
                                        {isWrongSelected && <IconX size={20} color="#ef4444" />}
                                    </Group>
                                </Paper>
                            )
                        })}
                    </Stack>
                </Radio.Group>

                {isFeedbackMode && (
                    <Paper p="md" radius="md" bg="gray.0" mt="md">
                        <Stack gap="md">
                            {feedbackVisibility === feedbackLevels.FULL && (
                                <>
                                    {feedback.justification && (
                                        <>
                                            <Text size="sm" fw={500}>
                                                Feedback:
                                            </Text>
                                            <Text size="sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(feedback.justification) }} />
                                        </>
                                    )}

                                    {reference && (
                                        <>
                                            <Text size="sm" fw={500}>
                                                Reference:
                                            </Text>
                                            <Text size="sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reference) }} />
                                        </>
                                    )}
                                </>
                            )}

                            {(feedbackVisibility === feedbackLevels.NONE || feedbackVisibility === feedbackLevels.NO_JUST) && (
                                <Text size="sm" c="dimmed">
                                    Response recorded.
                                </Text>
                            )}
                        </Stack>
                    </Paper>
                )}

                {!isFeedbackMode ? (
                    <Button
                        variant="filled"
                        color='dark'
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
                        color='dark'
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
