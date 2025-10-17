import { Box, Text, Button, Checkbox, Divider, Group, Modal, Select, Stack, Textarea, TextInput } from "@mantine/core"
import { Item } from "./QuestionBankTable"
import { useState, useEffect } from "react"

const EditQuestionModal = ({
    item,
    opened,
    onClose
}: {
    item: Item | null
    opened: boolean
    onClose: () => void
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
        }
    }, [item])

    const handleSave = () => {
        // TODO: Implement save functionality
        console.log('Saving item:', formData)
        onClose()
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
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default EditQuestionModal;