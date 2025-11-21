'use client'

import { useState } from 'react'
import { Container, Stack, Title, Card, Text, Button, FileInput, Alert, List, Group, Loader, Box } from '@mantine/core'
import { IconUpload, IconInfoCircle, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import * as xlsx from 'xlsx'

const UploadPageContent = () => {
    const { selectedCourseOffering } = useCourse()
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationStatus, setValidationStatus] = useState<{
        isValid: boolean
        message: string
        missingColumns?: string[]
    } | null>(null)
    const [validating, setValidating] = useState(false)

    const validateSpreadsheet = async (file: File) => {
        setValidating(true)
        setValidationStatus(null)

        try {
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const workbook = xlsx.read(buffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]

            if (!sheetName) {
                setValidationStatus({
                    isValid: false,
                    message: 'Spreadsheet contains no sheets'
                })
                return
            }

            const sheet = workbook.Sheets[sheetName]
            const rows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[]

            if (rows.length === 0) {
                setValidationStatus({
                    isValid: false,
                    message: 'Spreadsheet is empty'
                })
                return
            }

            // Get column headers (normalized to lowercase)
            const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())

            // Required columns (case-insensitive matches)
            const requiredColumns = [
                { names: ['module', 'module name', 'module_name'], display: 'Module' },
                { names: ['question_id', 'question id', 'questionid'], display: 'Question_ID' },
                { names: ['bloom_cat', 'bloom cat', 'bloom'], display: 'Bloom_Cat' },
                { names: ['stem'], display: 'Stem' },
                { names: ['response_a'], display: 'Response_A' },
                { names: ['response_b'], display: 'Response_B' },
                { names: ['response_c'], display: 'Response_C' },
                { names: ['response_d'], display: 'Response_D' },
                { names: ['correct'], display: 'Correct' }
            ]

            const missingColumns: string[] = []

            for (const col of requiredColumns) {
                const found = col.names.some(name => headers.includes(name))
                if (!found) {
                    missingColumns.push(col.display)
                }
            }

            if (missingColumns.length > 0) {
                setValidationStatus({
                    isValid: false,
                    message: `Missing required columns: ${missingColumns.join(', ')}`,
                    missingColumns
                })
            } else {
                setValidationStatus({
                    isValid: true,
                    message: `All required columns found. Ready to import ${rows.length} row(s).`
                })
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setValidationStatus({
                isValid: false,
                message: `Failed to read spreadsheet: ${errorMessage}`
            })
        } finally {
            setValidating(false)
        }
    }

    const handleFileChange = (selectedFile: File | null) => {
        setFile(selectedFile)
        setValidationStatus(null)

        if (selectedFile) {
            validateSpreadsheet(selectedFile)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!selectedCourseOffering) {
            setError('Please select a course offering from the dashboard')
            return
        }

        if (!file) {
            setError('Please choose a file to upload')
            return
        }

        if (!validationStatus?.isValid) {
            setError('Please fix validation errors before uploading')
            return
        }

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('courseId', selectedCourseOffering.course.id)
        formData.append('offeringId', selectedCourseOffering.id)

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            const data = await response.json() as {
                details: Array<{
                    status: string
                    externalQuestionId?: string | null
                    itemId?: string
                    optionsCreated?: number
                    error?: string
                }>
            }

            if (!response.ok) {
                throw new Error((data as { error?: string })?.error || 'Upload failed')
            }

            // Count the results
            const created = data.details.filter((d) => d.status === 'created').length
            const skipped = data.details.filter((d) => d.status?.includes('skipped')).length
            const errors = data.details.filter((d) => d.status === 'error').length

            // Show success notification
            notifications.show({
                title: 'Upload Successful',
                message: `Created: ${created} questions${skipped > 0 ? `, Skipped: ${skipped}` : ''}${errors > 0 ? `, Errors: ${errors}` : ''}`,
                color: 'green',
                icon: <IconCheck size={16} />,
                autoClose: 5000,
            })

            // Redirect to question bank after a brief delay
            setTimeout(() => {
                router.push('/question-bank')
            }, 2000)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload spreadsheet'
            setError(errorMessage)
            notifications.show({
                title: 'Upload Failed',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
                autoClose: 5000,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Title order={2}>Upload Questions</Title>

                {!selectedCourseOffering && (
                    <Alert icon={<IconInfoCircle />} title="No Course Selected" color="orange">
                        Please select a course offering from the dashboard before uploading questions.
                    </Alert>
                )}

                {selectedCourseOffering && (
                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="xs">
                            <Text fw={500}>Uploading to:</Text>
                            <Text size="sm" c="dimmed">
                                {selectedCourseOffering.course.code} - {selectedCourseOffering.course.title}
                            </Text>
                            <Text size="sm" c="dimmed">
                                {selectedCourseOffering.term.name}
                            </Text>
                        </Stack>
                    </Card>
                )}

                <form onSubmit={handleSubmit}>
                    <Stack gap="lg">
                        <Card withBorder padding="lg" radius="md" shadow="sm">
                            <Stack gap="md">
                                <Text fw={500} size="lg">Select Your Spreadsheet</Text>

                                <Box
                                    style={{
                                        border: '2px dashed #228be6',
                                        borderRadius: '12px',
                                        padding: '3rem 2rem',
                                        backgroundColor: '#f1f8ff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Stack gap="md" align="center">
                                        <IconUpload size={48} stroke={1.5} color="#228be6" />
                                        <FileInput
                                            placeholder="Click to choose .xlsx or .xls file"
                                            accept=".xlsx,.xls"
                                            value={file}
                                            onChange={handleFileChange}
                                            disabled={!selectedCourseOffering || loading}
                                            required
                                            styles={{
                                                input: {
                                                    border: 'none',
                                                    backgroundColor: 'transparent',
                                                    fontSize: '16px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    fontWeight: 500
                                                },
                                                root: {
                                                    width: '100%'
                                                },
                                                wrapper: {
                                                    width: '100%'
                                                }
                                            }}
                                        />
                                        <Text size="sm" c="dimmed">
                                            or drag and drop your file here
                                        </Text>
                                    </Stack>
                                </Box>

                                {validating && (
                                    <Alert icon={<Loader size={16} />} title="Validating..." color="blue">
                                        Checking spreadsheet format...
                                    </Alert>
                                )}

                                {validationStatus && !validating && (
                                    <Alert
                                        icon={validationStatus.isValid ? <IconCheck /> : <IconAlertCircle />}
                                        title={validationStatus.isValid ? "Valid Format" : "Invalid Format"}
                                        color={validationStatus.isValid ? "green" : "red"}
                                    >
                                        {validationStatus.message}
                                        {validationStatus.missingColumns && validationStatus.missingColumns.length > 0 && (
                                            <List size="sm" mt="xs">
                                                {validationStatus.missingColumns.map((col) => (
                                                    <List.Item key={col}>{col}</List.Item>
                                                ))}
                                            </List>
                                        )}
                                    </Alert>
                                )}

                                {error && (
                                    <Alert icon={<IconX />} title="Error" color="red" onClose={() => setError(null)} withCloseButton>
                                        {error}
                                    </Alert>
                                )}
                            </Stack>
                        </Card>

                        <Card withBorder padding="lg" radius="md">
                            <Stack gap="md">
                                <Group gap="xs">
                                    <IconInfoCircle size={20} />
                                    <Text fw={500}>Expected Spreadsheet Format</Text>
                                </Group>
                                <Text size="sm" c="dimmed">
                                    Your spreadsheet should include the following columns (case-insensitive):
                                </Text>
                                <List size="sm" spacing="xs">
                                    <List.Item><strong>Module</strong> - Module name</List.Item>
                                    <List.Item><strong>Question_ID</strong> - Unique question identifier</List.Item>
                                    <List.Item><strong>Bloom_Cat</strong> - Bloom&apos;s taxonomy category</List.Item>
                                    <List.Item><strong>Stem</strong> - Question text</List.Item>
                                    <List.Item><strong>Response_A, Response_B, Response_C, Response_D</strong> - Answer options</List.Item>
                                    <List.Item><strong>Justification_A, Justification_B, Justification_C, Justification_D</strong> - Explanations</List.Item>
                                    <List.Item><strong>Correct</strong> - Correct answer (A/B/C/D or full text)</List.Item>
                                    <List.Item><strong>Reference, Figure, PtBi, Average, Attempts, IRT_a, IRT_b, IRT_c</strong> - Optional metadata</List.Item>
                                </List>
                            </Stack>
                        </Card>

                        <Group justify="flex-end">
                            <Button
                                variant="subtle"
                                onClick={() => router.push('/question-bank')}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                leftSection={loading ? <Loader size={16} /> : <IconUpload size={16} />}
                                disabled={!selectedCourseOffering || !file || loading || !validationStatus?.isValid}
                                loading={loading}
                                size="lg"
                            >
                                {loading ? 'Uploading...' : 'Upload & Import'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Stack>
        </Container>
    )
}

export default function UploadPage() {
    return (
        <ProtectedRoute>
            <RoleBasedRoute
                permissions={{
                    requireAnyRole: ['INSTRUCTOR', 'TA']
                }}
                unauthorizedMessage="Only instructors and TAs can upload questions."
            >
                <UploadPageContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
