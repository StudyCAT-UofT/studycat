import { Box, Text, Button, Checkbox, Divider, Group, Modal, Select, Stack, Textarea, TextInput, Alert } from "@mantine/core"
import { Item } from "@/types"
import { useState, useEffect, useCallback } from "react"
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"
import { useCourse } from "@/lib/course-context"

const EditQuestionModal = ({
    item,
    opened,
    onClose,
    onSave,
    isCreating = false
}: {
    item: Item | null
    opened: boolean
    onClose: () => void
    onSave?: () => void
    isCreating?: boolean
    courseId?: string
}) => {
    const [formData, setFormData] = useState({
        externalQuestionId: '',
        moduleId: '',
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
    const [availableModules, setAvailableModules] = useState<Array<{ id: string, name: string }>>([])
    const { selectedCourseOffering } = useCourse()

    // Load available modules for the course
    const loadModules = useCallback(async () => {
        if (!selectedCourseOffering) {
            setError('No course offering selected')
            return
        }

        try {
            // Fetch modules for the current course offering
            const modulesResponse = await fetch(`/api/modules?courseOfferingId=${selectedCourseOffering.id}`)
            if (!modulesResponse.ok) {
                throw new Error('Failed to fetch modules')
            }
            const modulesData = await modulesResponse.json()
            setAvailableModules(modulesData.modules || [])
        } catch (error) {
            console.error('Failed to load modules:', error)
            setError('Failed to load available modules')
        }
    }, [selectedCourseOffering])

    // Reset state and form data when modal opens
    useEffect(() => {
        if (opened) {
            setError(null)
            setSuccess(false)
            setLoading(false)

            if (isCreating) {
                // Reset form for new question
                setFormData({
                    externalQuestionId: '',
                    moduleId: '',
                    bloom: '',
                    stem: '',
                    reference: '',
                    figureUrl: '',
                    options: [
                        { id: 'temp-1', label: 'A', text: '', justification: '', isCorrect: false },
                        { id: 'temp-2', label: 'B', text: '', justification: '', isCorrect: false },
                        { id: 'temp-3', label: 'C', text: '', justification: '', isCorrect: false },
                        { id: 'temp-4', label: 'D', text: '', justification: '', isCorrect: false }
                    ]
                })
                loadModules()
            } else if (item) {
                setFormData({
                    externalQuestionId: item.externalQuestionId,
                    moduleId: item.moduleId || '',
                    bloom: item.bloom,
                    stem: item.stem,
                    reference: item.reference || '',
                    figureUrl: item.figureUrl || '',
                    options: item.options.map(opt => ({
                        ...opt,
                        justification: opt.justification || ''
                    }))
                })
                loadModules()
            }
        }
    }, [opened, isCreating, item, loadModules])

    const handleSave = async () => {
        if (!isCreating && !item) return

        // Basic form validation
        if (!formData.externalQuestionId.trim()) {
            setError('Question ID is required')
            return
        }
        if (!formData.moduleId.trim()) {
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
            let response: Response

            if (isCreating) {
                // Create new question
                if (!selectedCourseOffering) {
                    throw new Error('Course offering is required for creating new questions')
                }

                response = await fetch('/api/items', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        courseId: selectedCourseOffering.course.id,
                        ...formData
                    }),
                })
            } else {
                // Update existing question
                response = await fetch(`/api/items/${item!.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(formData),
                })
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Failed to ${isCreating ? 'create' : 'save'} question`)
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
            setError(err instanceof Error ? err.message : `Failed to ${isCreating ? 'create' : 'save'} question`)
        } finally {
            setLoading(false)
        }
    }

    const updateOption = (index: number, field: string, value: string | boolean) => {
        const newOptions = [...formData.options]
        newOptions[index] = { ...newOptions[index], [field]: value }
        setFormData({ ...formData, options: newOptions })
    }

    if (!isCreating && !item) return null

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={isCreating ? "Create New Question" : "Edit Question"}
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
                        Question {isCreating ? 'created' : 'updated'} successfully!
                    </Alert>
                )}

                <Group grow>
                    <TextInput
                        label="Question ID"
                        value={formData.externalQuestionId}
                        onChange={(e) => setFormData({ ...formData, externalQuestionId: e.target.value })}
                    />
                    <Select
                        label="Module"
                        value={formData.moduleId}
                        onChange={(value) => setFormData({ ...formData, moduleId: value || '' })}
                        data={availableModules.map(module => ({
                            value: module.id,
                            label: module.name
                        }))}
                        placeholder="Select a module"
                        required
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
                    <Button variant="outline" onClick={onClose} disabled={loading} color="dark">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={loading} disabled={success} color="dark">
                        {success ? (isCreating ? 'Created!' : 'Saved!') : (isCreating ? 'Create Question' : 'Save Changes')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default EditQuestionModal;
