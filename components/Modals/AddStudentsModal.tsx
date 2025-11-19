'use client'

import { Text, Button, Group, Modal, Stack, Textarea, Alert } from "@mantine/core"
import { useState, useEffect } from "react"
import { IconAlertCircle, IconCheck } from "@tabler/icons-react"
import { useCourse } from "@/lib/course-context"

interface AddStudentsModalProps {
    opened: boolean
    onClose: () => void
    onSave?: () => void
}

const AddStudentsModal = ({
    opened,
    onClose,
    onSave
}: AddStudentsModalProps) => {
    const [usernamesText, setUsernamesText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [results, setResults] = useState<{
        created: number
        alreadyExists: number
        errors: number
    } | null>(null)
    const { selectedCourseOffering } = useCourse()

    // Reset state when modal opens
    useEffect(() => {
        if (opened) {
            setError(null)
            setSuccess(false)
            setLoading(false)
            setUsernamesText('')
            setResults(null)
        }
    }, [opened])

    const handleSave = async () => {
        if (!selectedCourseOffering?.id) {
            setError('No course offering selected')
            return
        }

        // Parse usernames from textarea (split by newlines)
        const usernames = usernamesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)

        if (usernames.length === 0) {
            setError('Please enter at least one username')
            return
        }

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    courseOfferingId: selectedCourseOffering.id,
                    usernames
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to add students')
            }

            const data = await response.json()
            setResults({
                created: data.results.created.length,
                alreadyExists: data.results.alreadyExists.length,
                errors: data.results.errors.length
            })
            setSuccess(true)

            // Call onSave callback to refresh the list
            if (onSave) {
                onSave()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add students')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Add Students"
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

                {success && results && (
                    <Alert
                        icon={<IconCheck size={16} />}
                        title="Students Added"
                        color="green"
                        variant="light"
                    >
                        <Stack gap="xs">
                            <Text size="sm">
                                {results.created} student{results.created !== 1 ? 's' : ''} added successfully
                            </Text>
                            {results.alreadyExists > 0 && (
                                <Text size="sm" c="dimmed">
                                    {results.alreadyExists} student{results.alreadyExists !== 1 ? 's' : ''} already enrolled
                                </Text>
                            )}
                            {results.errors > 0 && (
                                <Text size="sm" c="red">
                                    {results.errors} error{results.errors !== 1 ? 's' : ''} occurred
                                </Text>
                            )}
                        </Stack>
                    </Alert>
                )}

                <Text size="sm" c="dimmed">
                    Enter one UTORid per line. Each line will be treated as a new student.
                </Text>

                <Textarea
                    label="UTORids"
                    value={usernamesText}
                    onChange={(e) => setUsernamesText(e.target.value)}
                    minRows={8}
                    required
                    disabled={loading || success}
                />

                <Group justify="flex-end" mt="md">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {success ? 'Close' : 'Cancel'}
                    </Button>
                    <Button onClick={handleSave} loading={loading} disabled={success || !usernamesText.trim()}>
                        {success ? 'Added!' : 'Add Students'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default AddStudentsModal

