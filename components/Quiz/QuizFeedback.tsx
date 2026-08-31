import {
    Container,
    Stack,
    Title,
    Text,
    Paper,
    Group,
    Button,
    Badge,
    Divider,
    Accordion,
    ThemeIcon,
    SimpleGrid,
    Card,
    Alert,
    Box,
    Image,
    Flex,
} from '@mantine/core'
import { IconCheck, IconX, IconClock, IconInfoCircle } from '@tabler/icons-react'
import { CompositeChart } from '@mantine/charts'
import { FeedbackData, DetailedQuestionReview, feedbackLevels } from '@/types'
import { getBloomColor } from '@/utils/getBloomColor'

interface QuizFeedbackProps {
    feedbackData: FeedbackData
    onContinue: () => void
    onReturnToDashboard: () => void
    allMastered: boolean
}

export default function QuizFeedback({ feedbackData, onContinue, onReturnToDashboard, allMastered }: QuizFeedbackProps) {
    // Format time for display
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}m ${remainingSeconds}s`
    }

    // Get performance color
    const getPerformanceColor = (level: string) => {
        switch (level) {
            case 'Developing':
                return 'orange'
            case 'Proficient':
                return 'green'
            case 'Advanced':
                return 'blue'
            default:
                return 'gray'
        }
    }

    // Render question option with styling
    const renderOption = (question: DetailedQuestionReview, optionIndex: number, justificationVisible: boolean) => {
        const option = question.options?.[optionIndex]

        if (!option) {
            return null; 
        }

        const isSelected = optionIndex === question.selectedAnswerIndex
        const isCorrect = option.isCorrect

        let backgroundColor = 'transparent'
        let borderColor = '#e0e0e0'
        let icon = null

        if (isSelected && isCorrect) {
            backgroundColor = '#e8f5e9'
            borderColor = '#4caf50'
            icon = <IconCheck size={20} color="#4caf50" />
        } else if (isSelected && !isCorrect) {
            backgroundColor = '#ffebee'
            borderColor = '#f44336'
            icon = <IconX size={20} color="#f44336" />
        } else if (!isSelected && isCorrect) {
            backgroundColor = '#f1f8e9'
            borderColor = '#8bc34a'
            icon = <IconCheck size={16} color="#8bc34a" />
        }

        return (
            <Paper
                key={optionIndex}
                p="md"
                style={{
                    backgroundColor,
                    border: `2px solid ${borderColor}`,
                    marginBottom: '0.5rem',
                }}
            >
                <Group gap="sm" align="flex-start">
                    {icon && <Box mt={2}>{icon}</Box>}
                    <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="xs">
                            <Text fw={600}>{option.label}.</Text>
                            <Text>{option.text}</Text>
                        </Group>
                        {justificationVisible && option.justification && (
                            <Text size="sm" style={{ fontStyle: 'italic' }}>
                                {option.justification}
                            </Text>
                        )}
                    </Stack>
                </Group>
            </Paper>
        )
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                {/* Header */}
                <Stack gap="md" align="center">
                    <Title order={1}>Quiz Feedback</Title>
                    <Text size="lg">
                        {feedbackData.quizTitle}
                    </Text>
                </Stack>

                {/* Performance Summary */}
                <Paper p="xl" radius="md" withBorder>
                    <Stack gap="lg">
                        <Title order={2}>Performance Summary</Title>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                            <Card withBorder padding="lg">
                                <Stack gap="xs" align="center">
                                    <Text size="sm" tt="uppercase" fw={700}>
                                        Score
                                    </Text>
                                    <Text size="3rem" fw={700} c="blue.8">
                                        {feedbackData.percentage}%
                                    </Text>
                                    <Text size="sm">
                                        {feedbackData.questionsCorrect} / {feedbackData.questionsAttempted} correct
                                    </Text>
                                </Stack>
                            </Card>

                            <Card withBorder padding="lg">
                                <Stack gap="xs" align="center">
                                    <Text size="sm" tt="uppercase" fw={700}>
                                        Time Spent
                                    </Text>
                                    <Group gap="xs" align="center">
                                        <IconClock size={32} />
                                        <Text size="2rem" fw={700}>
                                            {formatTime(feedbackData.totalTimeMs)}
                                        </Text>
                                    </Group>
                                    <Text size="sm">
                                        Total time
                                    </Text>
                                </Stack>
                            </Card>
                        </SimpleGrid>
                    </Stack>
                </Paper>

                {/* Mastery Achievement Alert */}
                {allMastered && (
                    <Alert
                        icon={<IconCheck size={24} />}
                        color="green"
                        variant="light"
                        title="Congratulations! You've Mastered All Modules!"
                    >
                        <Stack gap="sm">
                            <Text size="sm" fw={500}>
                                You have achieved mastery in all modules covered by this quiz, causing it to end early!
                            </Text>
                            <Text size="sm">
                                <strong>What does mastery mean?</strong> Our adaptive system uses Item Response Theory (IRT) to estimate your mastery level for each module.
                                When your estimated mastery exceeds the mastery threshold set by your instructor, you&apos;ve demonstrated sufficient understanding of that topic.
                                Since you&apos;ve reached the mastery threshold for all modules in this quiz, there&apos;s no need to continue - you&apos;ve already shown you know the material!
                            </Text>
                            <Text size="sm">
                                Keep up the excellent work! You can return to the dashboard to practice other topics or review your performance below.
                            </Text>
                        </Stack>
                    </Alert>
                )}

                {/* Action Buttons - Positioned early for easy access */}
                <Paper p="lg" radius="md" withBorder style={{ position: 'sticky', top: 20, zIndex: 100, backgroundColor: 'white' }}>
                    <Group justify="center" gap="md">
                        {feedbackData.canContinue && (
                            <Button size="lg" color='dark' onClick={onContinue}>
                                Continue Quiz
                            </Button>
                        )}
                        <Button size="lg" variant="outline" color='dark' onClick={onReturnToDashboard}>
                            Return to Dashboard
                        </Button>
                    </Group>
                    {feedbackData.canContinue && feedbackData.continueReason === 'reached_limit' && (
                        <Text size="sm" ta="center" mt="md">
                            You&apos;ve reached the target of {feedbackData.fixedLength} questions, but you can continue practicing!
                        </Text>
                    )}
                </Paper>

                {/* Module Mastery Composite Chart */}
                {feedbackData.modulePerformance.length > 0 && (
                    <Paper p="xl" radius="md" withBorder>
                        <Stack gap="lg">
                            <Title order={2}>Module Performance</Title>

                            <Alert icon={<IconInfoCircle size={20} />} color="blue" variant="light">
                                <Text size="sm">
                                    <strong>Overall Mastery:</strong> This shows your overall understanding across all past quiz attempts, not just this quiz.
                                    The chart shows your current mastery level (theta) as bars compared to the mastery threshold shown as dots.
                                    When your mastery exceeds the threshold set by your instructor for this quiz, you&apos;ve achieved mastery!
                                </Text>
                            </Alert>

                            <Text size="sm">
                                Your current mastery level compared to mastery thresholds
                            </Text>

                            {/* Prepare data for chart */}
                            {(() => {
                                const chartData = feedbackData.modulePerformance.map(module => ({
                                    module: module.moduleName,
                                    'Your Mastery (θ)': module.theta,
                                    'Mastery Threshold': module.threshold,
                                }))

                                return (
                                    <CompositeChart
                                        h={300}
                                        data={chartData}
                                        dataKey="module"
                                        maxBarWidth={60}
                                        series={[
                                            { name: 'Your Mastery (θ)', color: 'blue.6', type: 'bar' },
                                            { name: 'Mastery Threshold', color: 'orange.6', type: 'line' },
                                        ]}
                                        curveType="linear"
                                        tickLine="xy"
                                        gridAxis="xy"
                                        withLegend
                                        strokeWidth={0}
                                        legendProps={{ verticalAlign: 'bottom', height: 50 }}
                                    />
                                )
                            })()}

                            <Divider />

                            <Alert color="gray" variant="light">
                                <Text size="sm">
                                    <strong>Why are there more questions from certain modules than others?</strong>
                                </Text>
                                <Text size="sm">
                                    Catalyze is a computerized adaptive testing platform, meaning quizzes adapt to every individual student.
                                    Questions from modules where your mastery value is lowest are prioritized, while questions from modules you&apos;ve already mastered won&apos;t be shown.
                                </Text>
                            </Alert>

                            {/* Individual module cards with details */}
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {feedbackData.modulePerformance.map(module => {
                                    const hasMastered = module.theta >= module.threshold

                                    return (
                                        <Card key={module.moduleId} withBorder padding="lg">
                                            <Stack gap="xs">
                                                <Group justify="space-between" align="center">
                                                    <Text fw={600}>{module.moduleName}</Text>
                                                    {module.questionsAttempted === 0 ? (
                                                        <Badge size="md" variant="light" color="gray">Not Attempted</Badge>
                                                    ) : hasMastered ? (
                                                        <Badge size="md" variant="light" color="green" leftSection={<IconCheck size={14} />}>
                                                            Mastered
                                                        </Badge>
                                                    ) : (
                                                        <Badge size="md" variant="light" color={getPerformanceColor(module.performanceLevel)}>
                                                            {module.performanceLevel}
                                                        </Badge>
                                                    )}
                                                </Group>
                                                <Group justify="space-between">
                                                    <Text size="sm">
                                                        <strong>Your Mastery:</strong> θ = {module.theta.toFixed(2)}
                                                    </Text>
                                                    <Text size="sm" c="orange.9" fw={500}>
                                                        <strong>Threshold:</strong> {module.threshold.toFixed(2)}
                                                    </Text>
                                                </Group>
                                                <Text size="sm">
                                                    <strong>This quiz:</strong> {module.questionsCorrect} / {module.questionsAttempted} correct
                                                </Text>
                                                {hasMastered && (
                                                    <Alert icon={<IconCheck size={16} />} color="green" variant="light" p="xs">
                                                        <Text size="xs">
                                                            Mastered! Your mastery exceeds the threshold.
                                                        </Text>
                                                    </Alert>
                                                )}
                                            </Stack>
                                        </Card>
                                    )
                                })}
                            </SimpleGrid>

                            {/* Resource placeholder */}
                            {feedbackData.modulePerformance.some(m => m.theta < m.threshold) && (
                                <Alert icon={<IconInfoCircle size={20} />} color="orange" variant="light">
                                    <Text size="sm" fw={500}>
                                        Recommended resources coming soon for modules where you can improve!
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Detailed Question Review */}
                {(feedbackData.feedbackVisibility === feedbackLevels.FULL || feedbackData.feedbackVisibility === feedbackLevels.NO_JUST) && feedbackData.questions.length > 0 ? (
                    <Paper p="xl" radius="md" withBorder>
                        <Stack gap="lg">
                            <Title order={2}>Question-by-Question Review</Title>
                            <Text size="sm">
                                Expand each question to see your answer, the correct answer, and justifications
                            </Text>

                            <Accordion variant="separated">
                                {feedbackData.questions.map((question, index) => (
                                    <Accordion.Item key={question.itemId} value={`question-${index}`}>
                                        <Accordion.Control>
                                            <Group justify="space-between" align="center" wrap="nowrap">
                                                <Group gap="md" align="center">
                                                    <ThemeIcon
                                                        color={question.isCorrect ? 'green' : 'red'}
                                                        variant="light"
                                                        size="lg"
                                                    >
                                                        {question.isCorrect ? <IconCheck size={20} /> : <IconX size={20} />}
                                                    </ThemeIcon>
                                                    <Stack gap={4}>
                                                        <Text fw={600}>Question {question.questionNumber}</Text>
                                                        <Group gap="xs">
                                                            <Badge size="md" variant="light">
                                                                {question.moduleName}
                                                            </Badge>
                                                            <Badge size="md" variant="light" color={getBloomColor(question.bloomLevel)}>
                                                                {question.bloomLevel}
                                                            </Badge>
                                                        </Group>
                                                    </Stack>
                                                </Group>
                                                <Badge
                                                    size="lg"
                                                    variant="light"
                                                    color={question.isCorrect ? 'green' : 'red'}
                                                >
                                                    {question.isCorrect ? 'Correct' : 'Incorrect'}
                                                </Badge>
                                            </Group>
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Stack gap="md">
                                                {/* Question stem */}
                                                <Box>
                                                    <Text fw={600} mb="xs">
                                                        Question:
                                                    </Text>
                                                    <Text>{question.stem}</Text>
                                                </Box>

                                                {/* Figure if present */}
                                                {question.figureUrl && (
                                                    <Flex mah="500px" justify="center">
                                                        <Image
                                                            src={question.figureUrl}
                                                            alt="Question figure"
                                                            w="auto"
                                                            fit="contain"
                                                        />
                                                    </Flex>
                                                )}

                                                {/* Reference if present */}
                                                {question.reference && (
                                                    <Text size="sm" style={{ fontStyle: 'italic' }}>
                                                        Reference: {question.reference}
                                                    </Text>
                                                )}

                                                <Divider />

                                                {/* Options */}
                                                <Box>
                                                    <Text fw={600} mb="sm">
                                                        Answer Options:
                                                    </Text>
                                                    <Stack gap="xs">
                                                        {[0, 1, 2, 3].map(optionIndex =>
                                                            renderOption(question, optionIndex, feedbackData.feedbackVisibility === feedbackLevels.FULL)
                                                        )}
                                                    </Stack>
                                                </Box>

                                                {/* Metadata */}
                                                <Group gap="md">
                                                    <Text size="sm">
                                                        Time: {formatTime(question.responseTimeMs)}
                                                    </Text>
                                                </Group>
                                            </Stack>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        </Stack>
                    </Paper>
                ) : feedbackData.feedbackVisibility === 'none' ? (
                    <Alert icon={<IconInfoCircle size={20} />} color="blue" variant="light">
                        <Text size="sm">
                            Detailed feedback is not available for this quiz.
                        </Text>
                    </Alert>
                ) : null}
            </Stack>
        </Container>
    )
}
