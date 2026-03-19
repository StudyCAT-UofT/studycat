'use client'

import { Modal, Stack, Text, Checkbox, Group, Button } from '@mantine/core'

type ExportDataType = 'attempt' | 'question' | 'theta'

interface ExportDataModalProps {
    opened: boolean
    onClose: () => void
    exportDataType: ExportDataType | null
    quizTitle: string
    includeIncomplete: boolean
    onIncludeIncompleteChange: (value: boolean) => void
    onConfirm: () => void
    loading: boolean
}

/**
 * Modal component for confirming data export
 * Displays quiz title and options for including incomplete attempts (for attempt/question data)
 */
export const ExportDataModal = ({
    opened,
    onClose,
    exportDataType,
    quizTitle,
    includeIncomplete,
    onIncludeIncompleteChange,
    onConfirm,
    loading
}: ExportDataModalProps) => {
    const getDataTypeLabel = () => {
        if (exportDataType === 'attempt') return 'attempt'
        if (exportDataType === 'question') return 'question'
        if (exportDataType === 'theta') return 'theta'
        return ''
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Confirm Data Export"
            centered
        >
            <Stack gap="md">
                <Text>
                    Exporting {getDataTypeLabel()} JSON data for: {quizTitle}
                </Text>
                {(exportDataType === 'attempt' || exportDataType === 'question') && (
                    <Checkbox
                        label="Include incomplete attempts"
                        checked={includeIncomplete}
                        onChange={(event) => onIncludeIncompleteChange(event.currentTarget.checked)}
                    />
                )}
                <Group justify="flex-end" mt="md">
                    <Button
                        variant="default"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        loading={loading}
                        color="dark"
                    >
                        Export
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

