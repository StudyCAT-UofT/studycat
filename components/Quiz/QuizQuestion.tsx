'use client'

import { Card, Stack, Title, Button, Radio } from '@mantine/core'
import { useState } from 'react'

interface QuizItem {
    item_id: string
    skill: string
    stem: string
    options: string[]
}

interface QuizQuestionProps {
    item: QuizItem
    onAnswer: (answerIndex: number) => void
}

const QuizQuestion = ({ item, onAnswer }: QuizQuestionProps) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    const handleSubmit = () => {
        if (selectedIndex !== null) {
            onAnswer(selectedIndex)
            setSelectedIndex(null)
        }
    }

    return (
        <Card withBorder padding="lg" radius="md">
            <Stack gap="md">
                <Title order={3}>{item.stem}</Title>

                <Radio.Group
                    value={selectedIndex?.toString() || ''}
                    onChange={(value) => setSelectedIndex(parseInt(value))}
                    name={`question-${item.item_id}`}
                >
                    <Stack gap="md" mt="md">
                        {item.options.map((option, index) => (
                            <Radio
                                key={index}
                                value={index.toString()}
                                label={option}
                                size="md"
                            />
                        ))}
                    </Stack>
                </Radio.Group>

                <Button
                    variant="filled"
                    onClick={handleSubmit}
                    disabled={selectedIndex === null}
                    fullWidth
                    mt="lg"
                >
                    Submit Answer
                </Button>
            </Stack>
        </Card>
    )
}

export default QuizQuestion
