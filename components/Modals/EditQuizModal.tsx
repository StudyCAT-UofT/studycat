import { Box, Text, Button, Group, Modal, Stack, TextInput, Alert, NumberInput, Switch } from "@mantine/core"
import { Quiz } from "@/types"
import { useState, useEffect, useCallback } from "react"
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"
import { useCourse } from "@/lib/course-context"
import { MultiSelect } from "@mantine/core"

const EditQuizModal = ({
    quiz,
    opened,
    onClose,
    onSave,
    isCreating = false,
}: {
    quiz: Quiz | null
    opened: boolean
    onClose: () => void
    onSave?: () => void
    isCreating?: boolean
}) => {
    const [formData, setFormData] = useState({
        title: '',
        includedModuleIds: [] as string[],
        masteryThresholds: {} as Record<string, number | undefined>,
        isActive: true,
        shuffled: false,
        fixedLength: 10
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

    // Load modules when modal opens
    useEffect(() => {
        if (opened) {
            loadModules()
        }
    }, [opened, loadModules])

    // Reset state and form data when modal opens
    useEffect(() => {
        if (opened) {
            setError(null)
            setSuccess(false)
            setLoading(false)

            if (isCreating) {
                // Reset form for new quiz
                setFormData({
                    title: '',
                    includedModuleIds: [],
                    masteryThresholds: {},
                    isActive: true,
                    shuffled: false,
                    fixedLength: 10
                })
            } else if (quiz) {
                setFormData({
                    title: quiz.title,
                    includedModuleIds: [], // Will be set when modules are loaded
                    masteryThresholds: {},
                    isActive: quiz.isActive,
                    shuffled: quiz.shuffled,
                    fixedLength: quiz.fixedLength
                })
            }
        }
    }, [opened, isCreating, quiz])

    // Map module names to IDs when modules are loaded and we're editing
    useEffect(() => {
    if (opened && !isCreating && quiz && availableModules.length > 0) {
            const moduleIds =
            quiz.quizModules?.map(qm => qm.moduleId).filter(Boolean) || []

            const thresholds: Record<string, number> = {}
            quiz.quizModules?.forEach(qm => {
                if (qm.moduleId && qm.masteryThreshold !== undefined) {
                    thresholds[qm.moduleId] = qm.masteryThreshold
                }
            })

            setFormData(prev => ({
            ...prev,
            includedModuleIds: moduleIds,
            masteryThresholds: thresholds
            }))
        }
    }, [opened, isCreating, quiz, availableModules])

    const handleModulesChange = (value: string[]) => {
        setFormData(prev => {
            const updatedThresholds = { ...prev.masteryThresholds }

            value.forEach(moduleId => {
            if (updatedThresholds[moduleId] === undefined) {
                updatedThresholds[moduleId] = 1.0 // default threshold
            }
            })

            // Remove thresholds for deselected modules
            Object.keys(updatedThresholds).forEach(moduleId => {
            if (!value.includes(moduleId)) {
                delete updatedThresholds[moduleId]
            }
            })

            return {
            ...prev,
            includedModuleIds: value,
            masteryThresholds: updatedThresholds
            }
        })
    }


    const handleSave = async () => {
        if (!isCreating && !quiz) return

        // Basic form validation
        if (!formData.title.trim()) {
            setError('Quiz title is required')
            return
        }
        if (formData.includedModuleIds.length === 0) {
            setError('At least one module must be selected')
            return
        }
        if (formData.fixedLength < 1) {
            setError('Number of questions must be at least 1')
            return
        }

        const masteryThresholdsArray = formData.includedModuleIds.map(id =>
            formData.masteryThresholds[id] ?? 1.0
        )

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            let response: Response

            if (isCreating) {
                // Create new quiz
                if (!selectedCourseOffering) {
                    throw new Error('Course offering is required for creating new quizzes')
                }

                response = await fetch('/api/quizzes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        courseOfferingId: selectedCourseOffering.id,
                        title: formData.title,
                        includedModuleIds: formData.includedModuleIds,
                        masteryThresholds: masteryThresholdsArray,
                        active: formData.isActive,
                        shuffled: formData.shuffled,
                        fixedLength: formData.fixedLength
                    }),
                })
            } else {
                // Update existing quiz
                response = await fetch(`/api/quizzes/${quiz!.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        title: formData.title,
                        includedModuleIds: formData.includedModuleIds,
                        masteryThresholds: masteryThresholdsArray,
                        active: formData.isActive,
                        shuffled: formData.shuffled,
                        fixedLength: formData.fixedLength
                    }),
                })
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || `Failed to ${isCreating ? 'create' : 'save'} quiz`)
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
            setError(err instanceof Error ? err.message : `Failed to ${isCreating ? 'create' : 'save'} quiz`)
        } finally {
            setLoading(false)
        }
    }

    if (!isCreating && !quiz) return null

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={isCreating ? "Create New Quiz" : "Edit Quiz"}
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
                        Quiz {isCreating ? 'created' : 'updated'} successfully!
                    </Alert>
                )}

                <TextInput
                    label="Quiz Title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter quiz title"
                    required
                />

                <MultiSelect
                    label="Modules to Include"
                    placeholder="Select modules"
                    data={availableModules.map(module => ({
                        value: module.id,
                        label: module.name
                    }))}
                    value={formData.includedModuleIds}
                    onChange={handleModulesChange}
                    required
                    searchable
                    clearable
                />

                {formData.includedModuleIds.length > 0 && (
                    <Stack gap="xs">
                        <Text fw={500} size="sm">
                        Mastery Thresholds
                        </Text>
                        <Text fw={400} size="xs">
                            Mastery thresholds represent the theta value where it can be reasonably assumed a student has mastered a certain module.
                        </Text>
                        <Text fw={400} size="xs">
                            Once a student&apos;s theta value reaches this threshold, questions from this module will no longer be shown.
                        </Text>
                        <Text fw={400} size="xs">
                            When a student has reached the threshold value for all included modules, the quiz will end.
                        </Text>
                        <Text fw={400} size="xs">
                            1.0 is a standard threshold. For a higher level of mastery, use a threshold around 1.3. For a lower level of mastery, use a threshold around 0.7.
                        </Text>

                        {formData.includedModuleIds.map(moduleId => {
                        const currModule = availableModules.find(m => m.id === moduleId)

                        return (
                            <NumberInput
                            key={moduleId}
                            label={currModule?.name || 'Module'}
                            value={formData.masteryThresholds[moduleId]}
                            onChange={(value) =>
                                setFormData(prev => ({
                                ...prev,
                                masteryThresholds: {
                                    ...prev.masteryThresholds,
                                    [moduleId]: typeof value === 'number' ? value : undefined
                                }
                                }))
                            }
                            min={-3}
                            max={3}
                            step={0.01}
                            />
                        )
                        })}
                    </Stack>
                )}

                <NumberInput
                    label="Number of Questions"
                    value={formData.fixedLength}
                    onChange={(value) => setFormData({ ...formData, fixedLength: typeof value === 'number' ? value : 10 })}
                    min={1}
                    max={100}
                    required
                />

                <Box>
                    <Text size="sm" fw={500} mb="xs">Status</Text>
                    <Switch
                        label={formData.isActive ? 'Active' : 'Inactive'}
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.currentTarget.checked })}
                    />
                </Box>

                <Box>
                    <Text size="sm" fw={500} mb="xs">Shuffle Options?</Text>
                    <Switch
                        label={formData.shuffled ? 'Shuffled' : 'Not Shuffled'}
                        checked={formData.shuffled}
                        onChange={(e) => setFormData({ ...formData, shuffled: e.currentTarget.checked })}
                    />
                </Box>

                <Group justify="flex-end" mt="md">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} loading={loading} disabled={success}>
                        {success ? (isCreating ? 'Created!' : 'Saved!') : (isCreating ? 'Create Quiz' : 'Save Changes')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default EditQuizModal;
