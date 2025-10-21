import { Box, Text, Button, Checkbox, Divider, Group, Modal, Select, Stack, Textarea, TextInput, Alert } from "@mantine/core"
import { Item } from "./QuestionBankTable"
import { useState, useEffect } from "react"
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"

const EditQuestionModal = ({
    item,
    opened,
    onClose,
    onSave
}: {
    item: Item | null
    opened: boolean
    onClose: () => void
    onSave?: () => void
}) => {
    const [formData, setFormData] = useState({
        externalQuestionId: '',
        module: '',
        bloom: '',
        stem: '',
        reference: '',
        figureUrl: '',
        options: [] as Array<{
            id: string
            label: string
            text: string
            justification: string
            isCorrect: boolean
        }>
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Update form data when item changes
    useEffect(() => {
        if (item) {
            setFormData({
                externalQuestionId: item.externalQuestionId,
                module: item.module,
                bloom: item.bloom,
                stem: item.stem,
                reference: item.reference || '',
                figureUrl: item.figureUrl || '',
                options: item.options.map(opt => ({
                    ...opt,
                    justification: opt.justification || ''
                }))
            })
            setError(null)
            setSuccess(false)
        }
    }, [item])

    const handleSave = async () => {
        if (!item) return

        // Basic form validation
        if (!formData.externalQuestionId.trim()) {
            setError('Question ID is required')
            return
        }
        if (!formData.module.trim()) {
            setError('Module is required')
            return
        }
        if (!formData.bloom) {
            setError('Bloom\'s taxonomy is required')
            return
        }
        if (!formData.stem.trim()) {
            setError('Question stem is required')
            return
        }
        if (formData.options.length === 0) {
            setError('At least one option is required')
            return
        }

        // Validate that at least one option is marked as correct
        const correctOptions = formData.options.filter(opt => opt.isCorrect)
        if (correctOptions.length === 0) {
            setError('At least one option must be marked as correct')
            return
        }

        // Validate that all options have text
        const emptyOptions = formData.options.filter(opt => !opt.text.trim())
        if (emptyOptions.length > 0) {
            setError('All options must have text')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await fetch(`/api/items/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to save question')
            }

            setSuccess(true)

            // Call the onSave callback to refresh data in parent component
            if (onSave) {
                onSave()
            }

            // Close modal after a brief delay to show success state
            setTimeout(() => {
                onClose()
            }, 1000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save question')
        } finally {
            setLoading(false)
        }
    }

    const updateOption = (index: number, field: string, value: string | boolean) => {
        const newOptions = [...formData.options]
        newOptions[index] = { ...newOptions[index], [field]: value }
        setFormData({ ...formData, options: newOptions })
    }

    if (!item) return null

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Edit Question"
            size="lg"
        >
            <Stack gap="md">
                {error && (
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="Error"
                        color="red"
                        variant="light"
                    >
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert
                        icon={<IconCheck size={16} />}
                        title="Success"
                        color="green"
                        variant="light"
                    >
                        Question updated successfully!
                    </Alert>
                )}

                <Group grow>
                    <TextInput
                        label="Question ID"
                        value={formData.externalQuestionId}
                        onChange={(e) => setFormData({ ...formData, externalQuestionId: e.target.value })}
                    />
                    <TextInput
                        label="Module"
                        value={formData.module}
                        onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    />
                </Group>

                <Select
                    label="Bloom's Taxonomy"
                    value={formData.bloom}
                    onChange={(value) => setFormData({ ...formData, bloom: value || '' })}
                    data={[
                        { value: 'REMEMBER', label: 'Remember' },
                        { value: 'UNDERSTAND', label: 'Understand' },
                        { value: 'APPLY', label: 'Apply' },
                        { value: 'ANALYZE', label: 'Analyze' },
                        { value: 'EVALUATE', label: 'Evaluate' },
                        { value: 'CREATE', label: 'Create' }
                    ]}
                />

                <Textarea
                    label="Question Stem"
                    value={formData.stem}
                    onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                    minRows={3}
                />

                <Group grow>
                    <TextInput
                        label="Reference"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                    <TextInput
                        label="Figure URL"
                        value={formData.figureUrl}
                        onChange={(e) => setFormData({ ...formData, figureUrl: e.target.value })}
                    />
                </Group>

                <Divider label="Options" labelPosition="left" />

                {formData.options.map((option, index) => (
                    <Box key={option.id} p="md" style={{ border: '1px solid #e9ecef', borderRadius: '8px' }}>
                        <Group mb="sm">
                            <Text fw={500}>Option {option.label}</Text>
                            <Checkbox
                                label="Correct Answer"
                                checked={option.isCorrect}
                                onChange={(e) => updateOption(index, 'isCorrect', e.currentTarget.checked)}
                                description="Multiple answers can be correct"
                            />
                        </Group>
                        <Textarea
                            label="Option Text"
                            value={option.text}
                            onChange={(e) => updateOption(index, 'text', e.target.value)}
                            minRows={2}
                        />
                        <Textarea
                            label="Justification"
                            value={option.justification}
                            onChange={(e) => updateOption(index, 'justification', e.target.value)}
                            minRows={2}
                            mt="sm"
                        />
                    </Box>
                ))}

                <Group justify="flex-end" mt="md">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={loading} disabled={success}>
                        {success ? 'Saved!' : 'Save Changes'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default EditQuestionModal;