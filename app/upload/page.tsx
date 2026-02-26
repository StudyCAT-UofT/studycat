'use client'

import { useState } from 'react'
import { Container, Stack, Title, Card, Text, Button, FileInput, Alert, List, Group, Loader, Box, Badge } from '@mantine/core'
import { IconUpload, IconInfoCircle, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import * as xlsx from 'xlsx'

// ---------------------------------------------------------------------------
// Format detection (mirrors server-side logic in app/api/upload/route.ts)
// ---------------------------------------------------------------------------

type SpreadsheetFormat = 'new' | 'legacy';

function detectFormat(headers: string[]): SpreadsheetFormat {
    if (headers.includes('question') && headers.includes('lecture') && headers.includes('correct_answer')) {
        return 'new';
    }
    return 'legacy';
}

// Required columns per format
const NEW_FORMAT_REQUIRED = [
    { names: ['lecture'],         display: 'lecture' },
    { names: ['question_id'],     display: 'question_id' },
    { names: ['category'],        display: 'category' },
    { names: ['question'],        display: 'question' },
    { names: ['correct_answer'],  display: 'correct_answer' },
];

const LEGACY_FORMAT_REQUIRED = [
    { names: ['module', 'module name', 'module_name'], display: 'Module' },
    { names: ['question_id', 'question id', 'questionid'], display: 'Question_ID' },
    { names: ['bloom_cat', 'bloom cat', 'bloom'], display: 'Bloom_Cat' },
    { names: ['stem'], display: 'Stem' },
    { names: ['response_a'], display: 'Response_A' },
    { names: ['response_b'], display: 'Response_B' },
    { names: ['response_c'], display: 'Response_C' },
    { names: ['response_d'], display: 'Response_D' },
    { names: ['correct'], display: 'Correct' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
        format?: SpreadsheetFormat
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
                setValidationStatus({ isValid: false, message: 'Spreadsheet contains no sheets' })
                return
            }

            const sheet = workbook.Sheets[sheetName]
            const rows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[]

            if (rows.length === 0) {
                setValidationStatus({ isValid: false, message: 'Spreadsheet is empty' })
                return
            }

            const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
            const format = detectFormat(headers)
            const requiredColumns = format === 'new' ? NEW_FORMAT_REQUIRED : LEGACY_FORMAT_REQUIRED

            const missingColumns: string[] = []
            for (const col of requiredColumns) {
                if (!col.names.some(name => headers.includes(name))) {
                    missingColumns.push(col.display)
                }
            }

            // For new format, also verify at least one answer option exists
            if (format === 'new') {
                const hasAnyOption = headers.some(h => /^answer_[a-z]$/.test(h))
                if (!hasAnyOption) missingColumns.push('answer_a (at least one answer option required)')
            }

            if (missingColumns.length > 0) {
                setValidationStatus({
                    isValid: false,
                    message: `Missing required columns: ${missingColumns.join(', ')}`,
                    missingColumns,
                    format,
                })
            } else {
                setValidationStatus({
                    isValid: true,
                    message: `All required columns found. Ready to import ${rows.length} row(s).`,
                    format,
                })
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setValidationStatus({ isValid: false, message: `Failed to read spreadsheet: ${errorMessage}` })
        } finally {
            setValidating(false)
        }
    }

    const handleFileChange = (selectedFile: File | null) => {
        setFile(selectedFile)
        setValidationStatus(null)
        if (selectedFile) validateSpreadsheet(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

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
                format?: SpreadsheetFormat
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

            const created = data.details.filter((d) => d.status === 'created').length
            const skipped = data.details.filter((d) => d.status?.includes('skipped')).length
            const errors  = data.details.filter((d) => d.status === 'error').length

            notifications.show({
                title: 'Upload Successful',
                message: `Created: ${created} questions${skipped > 0 ? `, Skipped: ${skipped}` : ''}${errors > 0 ? `, Errors: ${errors}` : ''}`,
                color: 'green',
                icon: <IconCheck size={16} />,
                autoClose: 5000,
            })

            setTimeout(() => { router.push('/question-bank') }, 2000)
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
                                            placeholder="Click to choose .xlsx, .xls, or .csv file"
                                            accept=".xlsx,.xls,.csv"
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
                                                root: { width: '100%' },
                                                wrapper: { width: '100%' }
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
                                        title={
                                            <Group gap="xs">
                                                <span>{validationStatus.isValid ? 'Valid Format' : 'Invalid Format'}</span>
                                                {validationStatus.format && (
                                                    <Badge size="sm" variant="light" color={validationStatus.format === 'new' ? 'blue' : 'gray'}>
                                                        {validationStatus.format === 'new' ? 'New format' : 'Legacy format'}
                                                    </Badge>
                                                )}
                                            </Group>
                                        }
                                        color={validationStatus.isValid ? 'green' : 'red'}
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

                                <Text size="sm" fw={500}>New format (primary):</Text>
                                <Text size="sm" c="dimmed">
                                    Export from Quizzical. Supports a flexible number of answer options (A, B, C, ...).
                                </Text>
                                <List size="sm" spacing="xs">
                                    <List.Item><strong>lecture</strong> - Module/lecture name</List.Item>
                                    <List.Item><strong>question_id</strong> - Unique question identifier</List.Item>
                                    <List.Item><strong>category</strong> - Bloom&apos;s taxonomy category</List.Item>
                                    <List.Item><strong>question</strong> - Question text</List.Item>
                                    <List.Item><strong>answer_a, answer_b, ...</strong> - Answer options (any number)</List.Item>
                                    <List.Item><strong>answer_justification_a, answer_justification_b, ...</strong> - Explanations (optional)</List.Item>
                                    <List.Item><strong>correct_answer</strong> - Correct option letter (A, B, C, ...)</List.Item>
                                    <List.Item><strong>question_figure, biserial, average, attempts</strong> - Optional metadata</List.Item>
                                </List>

                                <Text size="sm" fw={500} mt="xs">Legacy format (also supported):</Text>
                                <List size="sm" spacing="xs">
                                    <List.Item><strong>Module, Question_ID, Bloom_Cat, Stem</strong> - Required identifiers</List.Item>
                                    <List.Item><strong>Response_A, Response_B, Response_C, Response_D</strong> - Fixed 4 answer options</List.Item>
                                    <List.Item><strong>Correct</strong> - Correct answer letter</List.Item>
                                    <List.Item><strong>Justification_A–D, Reference, Figure, PtBi, Average, Attempts, IRT_a/b/c</strong> - Optional</List.Item>
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
                permissions={{ requireAnyRole: ['INSTRUCTOR', 'TA'] }}
                unauthorizedMessage="Only instructors and TAs can upload questions."
            >
                <UploadPageContent />
            </RoleBasedRoute>
        </ProtectedRoute>
    )
}
