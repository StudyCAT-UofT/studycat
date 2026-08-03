import { Box, Text, Button, Checkbox, Divider, Group, Modal, Select, Stack, Textarea, TextInput, Alert, Badge } from "@mantine/core"
import { Item } from "@/types"
import { useState, useEffect, useRef, useCallback } from "react"
import { IconAlertCircle, IconCheck, IconPlus } from "@tabler/icons-react"
import { useCourse } from "@/lib/course-context"
import { notifications } from "@mantine/notifications"

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
        irtA: '' as string,
        irtB: '' as string,
        irtC: '' as string,
        ptBi: '' as string,
        average: '' as string,
        attemptsCount: '' as string,
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
    const topRef = useRef<HTMLDivElement>(null);
    const nextOptionId = useRef(0)
    const { selectedCourseOffering } = useCourse()

    const MAX_QUESTION_STEM_CHARS = 16161
    const MAX_ANSWER_OPTION_CHARS = 5000
    const MAX_ANSWER_JUSTIFICATION_CHARS = 16384

    useEffect(() => {
        if (error) {
            topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [error]);

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
                    irtA: '',
                    irtB: '',
                    irtC: '',
                    ptBi: '',
                    average: '',
                    attemptsCount: '',
                    options: [
                        { id: 'temp-1', label: 'A', text: '', justification: '', isCorrect: false },
                        { id: 'temp-2', label: 'B', text: '', justification: '', isCorrect: false },
                        { id: 'temp-3', label: 'C', text: '', justification: '', isCorrect: false },
                        { id: 'temp-4', label: 'D', text: '', justification: '', isCorrect: false }
                    ]
                })
                nextOptionId.current = 5
                loadModules()
            } else if (item) {
                setFormData({
                    externalQuestionId: item.externalQuestionId,
                    moduleId: item.moduleId || '',
                    bloom: item.bloom,
                    stem: item.stem,
                    reference: item.reference || '',
                    figureUrl: item.figureUrl || '',
                    irtA: item.irtA != null ? String(item.irtA) : '',
                    irtB: item.irtB != null ? String(item.irtB) : '',
                    irtC: item.irtC != null ? String(item.irtC) : '',
                    ptBi: item.ptBi  != null ? String(item.ptBi) : '',
                    average: item.average  != null ? String(item.average) : '',
                    attemptsCount: item.attemptsCount  != null ? String(item.attemptsCount) : '',
                    options: item.options.map(opt => ({
                        ...opt,
                        justification: opt.justification || ''
                    }))
                })
                nextOptionId.current = 0
                loadModules()
            }
        }
    }, [opened, isCreating, item, loadModules])

    const isValidNumberInput = (value: string) => /^-?\d*\.?\d*$/.test(value)
    const isValidIntegerInput = (value: string) => /^-?\d*$/.test(value)

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
        if (formData.options.length < 2 || formData.options.length > 26) {
            setError('Questions must have between 2 and 26 answer options')
            return
        }

        const numberFields = [
            formData.irtA,
            formData.irtB,
            formData.irtC,
            formData.ptBi,
            formData.average,
        ];

        const hasInvalidNumbers = numberFields.some((val) => val !== '' && !isValidNumberInput(val)) ||
            (formData.attemptsCount !== '' && !isValidIntegerInput(formData.attemptsCount));

        if (hasInvalidNumbers) {
            setError("Please fix the invalid number fields (marked in red) before saving.");
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

        if (formData.stem.length > MAX_QUESTION_STEM_CHARS) {
            setError(`Question stem exceeds the allowed character limit (16161 characters)`)
            return
        }

        const invalidCharCountOption = formData.options.find(
            opt => opt.text.length > MAX_ANSWER_OPTION_CHARS || opt.justification.length > MAX_ANSWER_JUSTIFICATION_CHARS
        )
        if (invalidCharCountOption) {
            const field = invalidCharCountOption.text.length > MAX_ANSWER_OPTION_CHARS ? 'text' : 'justification'
            const max = field === 'text' ? MAX_ANSWER_OPTION_CHARS : MAX_ANSWER_JUSTIFICATION_CHARS
            setError(`Option ${invalidCharCountOption.label} ${field} exceeds the allowed character limit (${max} characters)`)
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const numOptions = formData.options.length;
            const formattedData = {
                ...formData,
                irtA: formData.irtA === '' ? 1 :  Number(formData.irtA),
                irtB: formData.irtB === '' ? 0 : Number(formData.irtB),
                irtC: formData.irtC === '' ? (1 / numOptions) : Number(formData.irtC),
                ptBi: formData.ptBi === '' ? null : Number(formData.ptBi),
                average: formData.average === '' ? null : Number(formData.average),
                attemptsCount: formData.attemptsCount === '' ? null : Number(formData.attemptsCount),
            }
            
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
                        ...formattedData
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
                    body: JSON.stringify(formattedData),
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

    const handleAddOption = () => {
        if (formData.options.length >= 26) return;
        
        const nextLabel = String.fromCharCode(65 + formData.options.length);
        const newId = `temp-${nextOptionId.current++}`
        setFormData(prev => ({
            ...prev,
            options: [
                ...prev.options,
                { id: newId, label: nextLabel, text: '', justification: '', isCorrect: false }
            ]
        }))
    }

    const handleRemoveOption = (indexToRemove: number) => {
    if (formData.options.length <= 2) return;

    setFormData(prev => {
        const newOptions = prev.options
            .filter((_, index) => index !== indexToRemove)
            .map((opt, index) => ({
                ...opt,
                label: String.fromCharCode(65 + index)
            }));
            
        return { ...prev, options: newOptions }
    })
}

    const [togglingActive, setTogglingActive] = useState(false)

    const handleToggleActive = async () => {
        if (!item) return
        setTogglingActive(true)
        try {
            const response = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !item.active })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to update item')
            }

            notifications.show({
                title: item.active ? 'Question Deactivated' : 'Question Activated',
                message: `${item.externalQuestionId} has been ${item.active ? 'deactivated' : 'activated'}.`,
                color: item.active ? 'orange' : 'green',
            })

            if (onSave) onSave()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update item')
        } finally {
            setTogglingActive(false)
        }
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
                {/* Active status toggle for existing questions */}
                {!isCreating && item && (
                    <Group justify="space-between" p="sm" style={{ border: '1px solid #e9ecef', borderRadius: '8px', backgroundColor: item.active ? undefined : '#fff5f5' }}>
                        <Group gap="sm">
                            <Text size="sm" fw={500}>Status:</Text>
                            <Badge color={item.active ? 'green' : 'gray'} variant="filled">
                                {item.active ? 'Active' : 'Inactive'}
                            </Badge>
                        </Group>
                        <Button
                            size="xs"
                            variant="light"
                            color={item.active ? 'orange' : 'green'}
                            onClick={handleToggleActive}
                            loading={togglingActive}
                        >
                            {item.active ? 'Deactivate' : 'Reactivate'}
                        </Button>
                    </Group>
                )}

                <div ref={topRef}>
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
                </div>

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
                        required
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
                    required
                />

                <Textarea
                    label="Question Stem"
                    value={formData.stem}
                    onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                    minRows={3}
                    required
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

                <Group grow>
                    <TextInput
                        label="IRT a"
                        value={formData.irtA}
                        onChange={(e) => setFormData({ ...formData, irtA: e.target.value })}
                        error={formData.irtA !== '' && !isValidNumberInput(formData.irtA) ? "Must be a valid number" : null}
                    />
                    <TextInput
                        label="IRT b"
                        value={formData.irtB}
                        onChange={(e) => setFormData({ ...formData, irtB: e.target.value })}
                        error={formData.irtB !== '' && !isValidNumberInput(formData.irtB) ? "Must be a valid number" : null}
                    />
                    <TextInput
                        label="IRT c"
                        value={formData.irtC}
                        onChange={(e) => setFormData({ ...formData, irtC: e.target.value })}
                        error={formData.irtC !== '' && !isValidNumberInput(formData.irtC) ? "Must be a valid number" : null}
                    />
                </Group>

                <Group grow>
                    <TextInput
                        label="Biserial"
                        value={formData.ptBi}
                        onChange={(e) => setFormData({ ...formData, ptBi: e.target.value })}
                        error={formData.ptBi !== '' && !isValidNumberInput(formData.ptBi) ? "Must be a valid number" : null}
                    />
                    <TextInput
                        label="Average"
                        value={formData.average}
                        onChange={(e) => setFormData({ ...formData, average: e.target.value })}
                        error={formData.average !== '' && !isValidNumberInput(formData.average) ? "Must be a valid number" : null}
                    />
                    <TextInput
                        label="Attempts"
                        value={formData.attemptsCount}
                        onChange={(e) => setFormData({ ...formData, attemptsCount: e.target.value })}
                        error={formData.attemptsCount !== '' && !isValidIntegerInput(formData.attemptsCount) ? "Must be a valid integer" : null}
                    />
                </Group>

                <Divider label="Options" labelPosition="left" />

                {formData.options.map((option, index) => (
                    <Box key={option.id} p="md" style={{ border: '1px solid #e9ecef', borderRadius: '8px' }}>
                        <Group justify="space-between" align="flex-start" w="100%" mb="sm">
                            <Group>
                                <Text fw={500}>Option {option.label}</Text>
                                <Checkbox
                                    label="Correct Answer"
                                    checked={option.isCorrect}
                                    onChange={(e) => updateOption(index, 'isCorrect', e.currentTarget.checked)}
                                    description="Multiple answers can be correct"
                                />
                            </Group>
                            <Button
                                size="xs"
                                variant="outline"
                                color="red"
                                onClick={() => handleRemoveOption(index)}
                                disabled={formData.options.length <= 2}
                            >
                                Remove
                            </Button>
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

                <Button 
                    variant="light"
                    color="blue"
                    leftSection={<IconPlus size={16} />}
                    onClick={handleAddOption}
                    disabled={formData.options.length >= 26}
                    fullWidth
                >
                    Add Option
                </Button>

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
