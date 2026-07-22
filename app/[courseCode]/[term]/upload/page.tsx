'use client'

import { useState, useRef } from 'react'
import { Container, Stack, Title, Card, Text, Button, FileInput, Alert, List, Group, Loader, Box, Checkbox, Badge, Divider } from '@mantine/core'
import { IconUpload, IconInfoCircle, IconCheck, IconX, IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { notifications } from '@mantine/notifications'
import { ProtectedRoute, RoleBasedRoute } from '@/components'
import { useCourse } from '@/lib/course-context'
import * as xlsx from 'xlsx'

type DetailEntry = {
    status: string
    externalQuestionId?: string | null
    itemId?: string
    optionsCreated?: number
    error?: string
    moduleName?: string
    bloom?: string
    stem?: string
    diff?: Record<string, { old: unknown; new: unknown }>
}

const TRUNCATE = 120
const trunc = (s: string) => s.length > TRUNCATE ? s.slice(0, TRUNCATE) + '…' : s

function EntryLabel({ d }: { d: DetailEntry }) {
    return (
        <Stack gap={2} style={{ lineHeight: 1.4 }}>
            <Text size="sm" fw={500}>{d.externalQuestionId}</Text>
            {(d.moduleName || d.bloom) && (
                <Text size="xs">{[d.moduleName, d.bloom].filter(Boolean).join(' · ')}</Text>
            )}
            {d.stem && <Text size="xs">{trunc(d.stem)}</Text>}
            {d.diff && Object.entries(d.diff).map(([field, { old: o, new: n }]) => (
                <div key={field} style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 18px 1fr',
                    gap: '0 6px',
                    alignItems: 'start',
                    marginTop: 1,
                }}>
                    <Text size="xs" fw={500} style={{ paddingTop: 1 }}>{field}:</Text>
                    <Text size="xs" c="red.9" style={{ textDecoration: 'line-through', wordBreak: 'break-word' }}>
                        {trunc(String(o ?? '—'))}
                    </Text>
                    <Text size="xs" ta="center" style={{ paddingTop: 1 }}>→</Text>
                    <Text size="xs" style={{ color: '#155724', wordBreak: 'break-word' }}>
                        {trunc(String(n ?? '—'))}
                    </Text>
                </div>
            ))}
        </Stack>
    )
}

type UploadView = 'form' | 'confirming' | 'done'

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
    const [deactivateMissing, setDeactivateMissing] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // Dry-run / confirmation state
    const [view, setView] = useState<UploadView>('form')
    const [dryRunDetails, setDryRunDetails] = useState<DetailEntry[]>([])
    const [approvedCreated, setApprovedCreated] = useState<Set<string>>(new Set())
    const [approvedUpdated, setApprovedUpdated] = useState<Set<string>>(new Set())
    const [approvedDeactivated, setApprovedDeactivated] = useState<Set<string>>(new Set())
    const [committing, setCommitting] = useState(false)
    const fileInputRef = useRef<HTMLButtonElement>(null)

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
                { names: ['lecture'],        display: 'lecture' },
                { names: ['question_id'],    display: 'question_id' },
                // { names: ['category'],       display: 'category' },
                { names: ['question'],       display: 'question' },
                { names: ['correct_answer'], display: 'correct_answer' },
            ]

            const missingColumns: string[] = []

            for (const col of requiredColumns) {
                const found = col.names.some(name => headers.includes(name))
                if (!found) {
                    missingColumns.push(col.display)
                }
            }

            // At least one answer option (answer_a, answer_b, ...) must be present
            const hasAnswerOption = headers.some(h => /^answer_[a-z]$/.test(h))
            if (!hasAnswerOption) {
                missingColumns.push('answer_a (at least one answer option required)')
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

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0]
            handleFileChange(droppedFile)
            e.dataTransfer.clearData()
        }
    }

    // Phase 1: dry-run — preview changes without writing to DB
    const handleDryRun = async (e: React.FormEvent) => {
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
        if (deactivateMissing) formData.append('deactivateMissing', 'true')
        formData.append('dryRun', 'true')

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json() as { details: DetailEntry[]; error?: string }

            if (!response.ok) {
                throw new Error(data?.error || 'Preview failed')
            }

            const created = data.details.filter(d => d.status === 'created')
            const updated = data.details.filter(d => d.status === 'updated')
            const deactivated = data.details.filter(d => d.status === 'deactivated')

            setApprovedCreated(new Set(created.map(d => d.externalQuestionId!).filter(Boolean)))
            setApprovedUpdated(new Set(updated.map(d => d.externalQuestionId!).filter(Boolean)))
            setApprovedDeactivated(new Set(deactivated.map(d => d.itemId!).filter(Boolean)))

            setDryRunDetails(data.details)
            setView('confirming')
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to preview spreadsheet'
            setError(errorMessage)
            notifications.show({
                title: 'Preview Failed',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
                autoClose: 5000,
            })
        } finally {
            setLoading(false)
        }
    }

    // Phase 2: commit — write only the approved changes to DB
    const handleCommit = async () => {
        if (!selectedCourseOffering || !file) return

        setCommitting(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('courseId', selectedCourseOffering.course.id)
        formData.append('offeringId', selectedCourseOffering.id)
        formData.append('approvedQuestionIds', JSON.stringify([...approvedCreated, ...approvedUpdated]))
        formData.append('deactivateIds', JSON.stringify([...approvedDeactivated]))

        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await response.json() as { details: DetailEntry[]; error?: string }

            if (!response.ok) {
                throw new Error(data?.error || 'Upload failed')
            }

            const created = data.details.filter(d => d.status === 'created').length
            const updated = data.details.filter(d => d.status === 'updated').length
            const unchanged = data.details.filter(d => d.status === 'unchanged').length
            const deactivated = data.details.filter(d => d.status === 'deactivated').length
            const skipped = data.details.filter(d => d.status?.startsWith('skipped')).length
            const errors = data.details.filter(d => d.status === 'error').length

            const parts: string[] = []
            if (created > 0) parts.push(`Created: ${created}`)
            if (updated > 0) parts.push(`Updated: ${updated}`)
            if (unchanged > 0) parts.push(`Unchanged: ${unchanged}`)
            if (skipped > 0) parts.push(`Skipped: ${skipped}`)
            if (errors > 0) parts.push(`Errors: ${errors}`)
            notifications.show({
                title: 'Upload Successful',
                message: parts.join(', ') || 'No changes',
                color: 'green',
                icon: <IconCheck size={16} />,
                autoClose: 5000,
            })
            
            if (errors > 0) {
                notifications.show({
                    title: `${errors} Question(s) Failed`,
                    message: data.details
                        .filter(d => d.status === 'error')
                        .map(d => `• ${d.externalQuestionId ?? 'unknown'}: ${d.error ?? 'unknown error'}`)
                        .join('\n'),
                    color: 'red',
                    icon: <IconAlertCircle size={16} />,
                    autoClose: false,
                })
                console.error(errors)
            }

            if (skipped > 0) {
                notifications.show({
                    title: `${skipped} Question(s) Skipped`,
                    message: data.details
                        .filter(d => d.status?.startsWith('skipped'))
                        .map(d => `• ${d.externalQuestionId ?? 'unknown'}${d.error ? ': ' + d.error : ''}`)
                        .join('\n'),
                    color: 'orange',
                    icon: <IconAlertTriangle size={16} />,
                    autoClose: false,
                })
            }

            if (deactivated > 0) {
                notifications.show({
                    title: 'Questions Deactivated',
                    message: `${deactivated} question(s) were deactivated.`,
                    color: 'orange',
                    icon: <IconAlertTriangle size={16} />,
                    autoClose: 8000,
                })
            }

            setView('done')
            if (!selectedCourseOffering) return;
            setTimeout(() => router.push(`/${selectedCourseOffering.course.code}/${selectedCourseOffering.term.name.replace(/\s+/g, '-')}//question-bank`), 2000)

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
            setCommitting(false)
        }
    }

    // ── Confirmation screen ──────────────────────────────────────────────────
    if (view === 'confirming') {
        const createdEntries = dryRunDetails.filter(d => d.status === 'created')
        const updatedEntries = dryRunDetails.filter(d => d.status === 'updated')
        const deactivatedEntries = dryRunDetails.filter(d => d.status === 'deactivated')
        const unchangedEntries = dryRunDetails.filter(d => d.status === 'unchanged')
        const skippedEntries = dryRunDetails.filter(d => d.status?.startsWith('skipped'))
        const errorEntries = dryRunDetails.filter(d => d.status === 'error')

        const nothingApproved =
            approvedCreated.size === 0 && approvedUpdated.size === 0 && approvedDeactivated.size === 0

        const toggleSet = (set: Set<string>, setFn: (s: Set<string>) => void, key: string, checked: boolean) => {
            const next = new Set(set)
            if (checked) next.add(key)
            else next.delete(key)
            setFn(next)
        }

        return (
            <Container size="md" py="xl">
                <Stack gap="lg">
                    <Group justify="space-between" align="center">
                        <Title order={1}>Review Changes</Title>
                        <Text size="sm">Uncheck rows you want to skip, then confirm.</Text>
                    </Group>

                    {/* Created */}
                    {createdEntries.length > 0 && (
                        <Card withBorder>
                            <Group justify="space-between" mb="sm">
                                <Group gap="xs">
                                    <Badge color="green" variant="light">{createdEntries.length}</Badge>
                                    <Text fw={500}>To be created</Text>
                                </Group>
                                <Group gap="xs">
                                    <Button size="xs" variant="subtle" color='dark'
                                        onClick={() => setApprovedCreated(new Set(createdEntries.map(d => d.externalQuestionId!)))}>
                                        All
                                    </Button>
                                    <Button size="xs" variant="subtle" color="gray"
                                        onClick={() => setApprovedCreated(new Set())}>
                                        None
                                    </Button>
                                </Group>
                            </Group>
                            <Stack gap={10}>
                                {createdEntries.map((d) => (
                                    <Checkbox
                                        key={d.externalQuestionId}
                                        label={<EntryLabel d={d} />}
                                        checked={approvedCreated.has(d.externalQuestionId!)}
                                        onChange={(e) => toggleSet(approvedCreated, setApprovedCreated, d.externalQuestionId!, e.currentTarget.checked)}
                                        styles={{ label: { paddingLeft: 8 } }}
                                    />
                                ))}
                            </Stack>
                        </Card>
                    )}

                    {/* Updated */}
                    {updatedEntries.length > 0 && (
                        <Card withBorder>
                            <Group justify="space-between" mb="sm">
                                <Group gap="xs">
                                    <Badge color="blue" variant="light">{updatedEntries.length}</Badge>
                                    <Text fw={500}>To be updated</Text>
                                </Group>
                                <Group gap="xs">
                                    <Button size="xs" variant="subtle" color='dark'
                                        onClick={() => setApprovedUpdated(new Set(updatedEntries.map(d => d.externalQuestionId!)))}>
                                        All
                                    </Button>
                                    <Button size="xs" variant="subtle" color="gray"
                                        onClick={() => setApprovedUpdated(new Set())}>
                                        None
                                    </Button>
                                </Group>
                            </Group>
                            <Stack gap={10}>
                                {updatedEntries.map((d) => (
                                    <Checkbox
                                        key={d.externalQuestionId}
                                        label={<EntryLabel d={d} />}
                                        checked={approvedUpdated.has(d.externalQuestionId!)}
                                        onChange={(e) => toggleSet(approvedUpdated, setApprovedUpdated, d.externalQuestionId!, e.currentTarget.checked)}
                                        styles={{ label: { paddingLeft: 8 } }}
                                    />
                                ))}
                            </Stack>
                        </Card>
                    )}

                    {/* Deactivated */}
                    {deactivatedEntries.length > 0 && (
                        <Card withBorder>
                            <Group justify="space-between" mb="sm">
                                <Group gap="xs">
                                    <Badge color="orange" variant="light">{deactivatedEntries.length}</Badge>
                                    <Text fw={500}>To be deactivated</Text>
                                </Group>
                                <Group gap="xs">
                                    <Button size="xs" variant="subtle" color='dark'
                                        onClick={() => setApprovedDeactivated(new Set(deactivatedEntries.map(d => d.itemId!)))}>
                                        All
                                    </Button>
                                    <Button size="xs" variant="subtle" color="gray"
                                        onClick={() => setApprovedDeactivated(new Set())}>
                                        None
                                    </Button>
                                </Group>
                            </Group>
                            <Stack gap={10}>
                                {deactivatedEntries.map((d) => (
                                    <Checkbox
                                        key={d.itemId}
                                        label={<EntryLabel d={d} />}
                                        checked={approvedDeactivated.has(d.itemId!)}
                                        onChange={(e) => toggleSet(approvedDeactivated, setApprovedDeactivated, d.itemId!, e.currentTarget.checked)}
                                        styles={{ label: { paddingLeft: 8 } }}
                                    />
                                ))}
                            </Stack>
                        </Card>
                    )}

                    {/* Unchanged — read-only */}
                    {unchangedEntries.length > 0 && (
                        <Card withBorder>
                            <Group gap="xs" mb="xs">
                                <Badge color="gray" variant="light">{unchangedEntries.length}</Badge>
                                <Text fw={500}>Unchanged (no action)</Text>
                            </Group>
                            <Text size="sm" style={{ wordBreak: 'break-word' }}>
                                {unchangedEntries.map(d => d.externalQuestionId).join(', ')}
                            </Text>
                        </Card>
                    )}

                    {/* Skipped Rows */}
                    {skippedEntries.length > 0 && (
                        <Alert color="orange" icon={<IconAlertTriangle size={16} />} title="Rows Skipped">
                            <Text size="sm">
                                {skippedEntries.length} row(s) were skipped due to missing data, duplicates, or validation rules.
                            </Text>
                        </Alert>
                    )}

                    {/* Fatal / File Errors */}
                    {errorEntries.length > 0 && (
                        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Critical Parsing Errors">
                            <Text size="sm" mb="sm" fw={500}>
                                The following files or entries encountered critical errors and could not be processed:
                            </Text>
                            <List size="sm" withPadding styles={{ item: { color: 'black' } }}>
                                {errorEntries.map((entry, idx) => (
                                    <List.Item key={idx}>
                                        {entry.error || 'An unknown error occurred during parsing.'}
                                    </List.Item>
                                ))}
                            </List>
                        </Alert>
                    )}

                    {error && (
                        <Alert icon={<IconX />} title="Error" color="red" onClose={() => setError(null)} withCloseButton>
                            {error}
                        </Alert>
                    )}

                    <Divider />

                    <Group justify="flex-end">
                        <Button variant="subtle" color='dark' onClick={() => setView('form')} disabled={committing}>
                            Back
                        </Button>
                        <Button
                            color='dark'
                            onClick={handleCommit}
                            loading={committing}
                            disabled={nothingApproved}
                            leftSection={<IconCheck size={16} />}
                            size="lg"
                        >
                            Confirm & Import
                        </Button>
                    </Group>
                </Stack>
            </Container>
        )
    }

    // ── Success screen ───────────────────────────────────────────────────────
    if (view === 'done') {
        return (
            <Container size="md" py="xl">
                <Stack gap="lg" align="center">
                    <IconCheck size={48} color="green" />
                    <Title order={1}>Import Complete</Title>
                    <Text>Redirecting to question bank...</Text>
                </Stack>
            </Container>
        )
    }

    // ── Upload form ──────────────────────────────────────────────────────────
    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Title order={1}>Upload Questions</Title>

                {!selectedCourseOffering && (
                    <Alert icon={<IconInfoCircle />} title="No Course Selected" color="orange">
                        Please select a course offering from the dashboard before uploading questions.
                    </Alert>
                )}

                {selectedCourseOffering && (
                    <Card withBorder padding="lg" radius="md">
                        <Stack gap="xs">
                            <Text fw={500}>Uploading to:</Text>
                            <Text size="sm">
                                {selectedCourseOffering.course.code} - {selectedCourseOffering.course.title}
                            </Text>
                            <Text size="sm">
                                {selectedCourseOffering.term.name}
                            </Text>
                        </Stack>
                    </Card>
                )}

                <form onSubmit={handleDryRun}>
                    <Stack gap="lg">
                        <Card withBorder padding="lg" radius="md" shadow="sm">
                            <Stack gap="md">
                                <Text fw={500} size="lg">Select Your Spreadsheet</Text>

                                <Box
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    style={{
                                        border: `2px dashed ${isDragging ? '#044f95' : '#228be6'}`,
                                        borderRadius: '12px',
                                        padding: '3rem 2rem',
                                        backgroundColor: isDragging ? '#dbeefb' : '#f1f8ff',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Stack gap="md" align="center">
                                        <IconUpload size={48} stroke={1.5} color="#228be6" />
                                        <div onClick={e => e.stopPropagation()}>
                                        <FileInput
                                            ref={fileInputRef}
                                            label="Choose a spreadsheet file"
                                            placeholder="Click to choose .xlsx, .xls, or .csv file"
                                            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                            value={file}
                                            onChange={handleFileChange}
                                            disabled={!selectedCourseOffering || loading}
                                            required
                                            styles={{
                                                label: {
                                                    position: 'absolute',
                                                    width: '1px',
                                                    height: '1px',
                                                    overflow: 'hidden',
                                                    clip: 'rect(0 0 0 0)',
                                                    clipPath: 'inset(50%)',
                                                    whiteSpace: 'nowrap',
                                                },
                                                input: {
                                                    border: 'none',
                                                    backgroundColor: 'transparent',
                                                    fontSize: '16px',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    color: '#000',
                                                },
                                                root: {
                                                    width: '100%'
                                                },
                                                wrapper: {
                                                    width: '100%'
                                                }
                                            }}
                                        />
                                        </div>
                                        <Text size="sm">
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

                                <Checkbox
                                    label="Deactivate questions not in file"
                                    description="Questions with IDs not present in the uploaded file will be deactivated"
                                    checked={deactivateMissing}
                                    onChange={(e) => setDeactivateMissing(e.currentTarget.checked)}
                                    disabled={!selectedCourseOffering || loading}
                                    styles={{ description: { color: 'black' } }}
                                />
                            </Stack>
                        </Card>

                        <Card withBorder padding="lg" radius="md">
                            <Stack gap="md">
                                <Group gap="xs">
                                    <IconInfoCircle size={20} />
                                    <Text fw={500}>Expected Spreadsheet Format</Text>
                                </Group>
                                <Text size="sm">
                                    Your spreadsheet (.xlsx, .xls, or .csv file) should include the following columns (case-insensitive):
                                </Text>
                                <List size="sm" spacing="xs">
                                    <List.Item><strong>lecture</strong> - Module/lecture name</List.Item>
                                    <List.Item><strong>question_id</strong> - Unique question identifier</List.Item>
                                    <List.Item><strong>category</strong> - Bloom&apos;s taxonomy category</List.Item>
                                    <List.Item><strong>question</strong> - Question text</List.Item>
                                    <List.Item><strong>answer_a, answer_b, ...</strong> - Answer options (flexible count)</List.Item>
                                    <List.Item><strong>answer_justification_a, answer_justification_b, ...</strong> - Explanations (optional)</List.Item>
                                    <List.Item><strong>correct_answer</strong> - Correct option letter (A, B, C, ...)</List.Item>
                                    <List.Item><strong>status</strong> - <code>active</code> or <code>inactive</code> (optional, defaults to active)</List.Item>
                                    <List.Item><strong>question_figure, biserial, average, attempts, irt_a, irt_b, irt_c, reference</strong> - Optional metadata</List.Item>
                                </List>
                                <Text size="sm" mt="xs">
                                    Re-uploading a spreadsheet will update existing questions matched by <strong>question_id</strong>. New questions will be created automatically.
                                </Text>
                            </Stack>
                        </Card>

                        <Group justify="flex-end">
                            <Button
                                variant="subtle"
                                color='dark'
                                onClick={() => {
                                    if (selectedCourseOffering) {
                                        router.push(`/${selectedCourseOffering.course.code}/${selectedCourseOffering.term.name.replace(/\s+/g, '-')}/question-bank`)
                                    }
                                }}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                color='dark'
                                type="submit"
                                leftSection={loading ? <Loader size={16} /> : <IconUpload size={16} />}
                                disabled={!selectedCourseOffering || !file || loading || !validationStatus?.isValid}
                                loading={loading}
                                size="lg"
                            >
                                {loading ? 'Previewing...' : 'Preview Changes'}
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
