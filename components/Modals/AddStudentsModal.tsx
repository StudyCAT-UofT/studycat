'use client'

import { Text, Button, Group, Modal, Stack, Alert, FileInput, Box, List, Loader } from "@mantine/core"
import { useState, useEffect } from "react"
import { IconAlertCircle, IconCheck, IconUpload, IconInfoCircle, IconX } from "@tabler/icons-react"
import { useCourse } from "@/lib/course-context"
import { notifications } from '@mantine/notifications'
import Papa from 'papaparse'

interface AddStudentsModalProps {
    opened: boolean
    onClose: () => void
    onSave?: () => void
}

interface StudentRow {
    username: string
    givenName?: string
    familyName?: string
}

const AddStudentsModal = ({
    opened,
    onClose,
    onSave
}: AddStudentsModalProps) => {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validating, setValidating] = useState(false)
    const [validationStatus, setValidationStatus] = useState<{
        isValid: boolean
        message: string
        missingColumns?: string[]
    } | null>(null)
    const { selectedCourseOffering } = useCourse()

    // Reset state when modal opens
    useEffect(() => {
        if (opened) {
            setError(null)
            setLoading(false)
            setFile(null)
            setValidationStatus(null)
            setValidating(false)
        }
    }, [opened])

    const validateCSV = async (file: File) => {
        setValidating(true)
        setValidationStatus(null)

        try {
            const text = await file.text()
            
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) {
                        setValidationStatus({
                            isValid: false,
                            message: 'CSV file is empty'
                        })
                        setValidating(false)
                        return
                    }

                    // Get column headers (case-insensitive check)
                    const headers = results.meta.fields?.map(h => h.toLowerCase().trim()) || []
                    
                    // Check for required username column (UTORid or username)
                    const hasUsername = headers.some(h => 
                        h === 'utorid' || h === 'username'
                    )

                    if (!hasUsername) {
                        setValidationStatus({
                            isValid: false,
                            message: 'Missing required column: UTORid or username',
                            missingColumns: ['UTORid (or username)']
                        })
                        setValidating(false)
                        return
                    }

                    // Optional name columns
                    const hasGivenName = headers.some(h => 
                        h === 'givenname' || h === 'firstname'
                    )
                    const hasFamilyName = headers.some(h => 
                        h === 'familyname' || h === 'lastname'
                    )

                    const optionalInfo = []
                    if (hasGivenName) optionalInfo.push('givenName')
                    if (hasFamilyName) optionalInfo.push('familyName')

                    setValidationStatus({
                        isValid: true,
                        message: `Valid format. Ready to import ${results.data.length} student(s).${optionalInfo.length > 0 ? ` Found optional columns: ${optionalInfo.join(', ')}` : ''}`
                    })
                    setValidating(false)
                },
                error: (error: Error) => {
                    setValidationStatus({
                        isValid: false,
                        message: `Failed to parse CSV: ${error.message}`
                    })
                    setValidating(false)
                }
            })
        } catch (err: unknown) {
            setValidationStatus({
                isValid: false,
                message: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}`
            })
            setValidating(false)
        }
    }

    const handleFileChange = (selectedFile: File | null) => {
        setFile(selectedFile)
        setValidationStatus(null)
        
        if (selectedFile) {
            validateCSV(selectedFile)
        }
    }

    const handleSave = async () => {
        if (!selectedCourseOffering?.id) {
            setError('No course offering selected')
            return
        }

        if (!file) {
            setError('Please select a CSV file')
            return
        }

        if (!validationStatus?.isValid) {
            setError('Please fix validation errors before uploading')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const text = await file.text()
            
            Papa.parse<Record<string, string>>(text, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    try {
                        // Map CSV rows to student data with flexible column naming
                        const students: StudentRow[] = results.data.map((row: Record<string, string>) => {
                            // Normalize column names
                            const normalizedRow: Record<string, string> = {}
                            Object.keys(row).forEach(key => {
                                normalizedRow[key.toLowerCase().trim()] = row[key]?.trim() || ''
                            })

                            // Extract username (UTORid or username)
                            const username = normalizedRow['utorid'] || normalizedRow['username'] || ''
                            
                            // Extract given name (givenName or firstName)
                            const givenName = normalizedRow['givenname'] || normalizedRow['firstname'] || ''
                            
                            // Extract family name (familyName or lastName)
                            const familyName = normalizedRow['familyname'] || normalizedRow['lastname'] || ''

                            return {
                                username,
                                givenName: givenName || undefined,
                                familyName: familyName || undefined
                            }
                        }).filter(student => student.username) // Filter out rows without username

                        const response = await fetch('/api/students', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                courseOfferingId: selectedCourseOffering.id,
                                students
                            })
                        })

                        if (!response.ok) {
                            const errorData = await response.json()
                            throw new Error(errorData.error || 'Failed to add students')
                        }

                        const data = await response.json()
                        const { created, alreadyExists, errors, missingNames } = data.results
                        
                        // Determine if operation was successful
                        const totalCreated = created.length
                        const totalErrors = errors.length
                        const isFailure = totalCreated === 0 && totalErrors > 0

                        if (isFailure) {
                            // All failed - show error notification with details
                            const errorDetails = errors.map((e: { username: string; error: string }) => `${e.username}: ${e.error}`).join('\n')
                            notifications.show({
                                title: 'Failed to Add Students',
                                message: `${totalErrors} error${totalErrors !== 1 ? 's' : ''} occurred:\n${errorDetails}`,
                                color: 'red',
                                icon: <IconX size={16} />,
                                autoClose: 10000,
                            })
                        } else {
                            // Some or all succeeded - show success notification
                            const messageParts = []
                            if (totalCreated > 0) {
                                messageParts.push(`${totalCreated} student${totalCreated !== 1 ? 's' : ''} added`)
                            }
                            if (alreadyExists.length > 0) {
                                messageParts.push(`${alreadyExists.length} already enrolled`)
                            }
                            if (missingNames > 0) {
                                messageParts.push(`${missingNames} without names`)
                            }
                            if (totalErrors > 0) {
                                messageParts.push(`${totalErrors} error${totalErrors !== 1 ? 's' : ''}`)
                            }

                            notifications.show({
                                title: 'Students Added Successfully',
                                message: messageParts.join(', '),
                                color: 'green',
                                icon: <IconCheck size={16} />,
                                autoClose: 5000,
                            })

                            // Close modal and refresh data
                            onClose()
                            if (onSave) {
                                onSave()
                            }
                        }
                        
                        setLoading(false)
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to add students')
                        notifications.show({
                            title: 'Upload Failed',
                            message: err instanceof Error ? err.message : 'An error occurred during upload',
                            color: 'red',
                            icon: <IconX size={16} />,
                            autoClose: 5000,
                        })
                        setLoading(false)
                    }
                },
                error: (error: Error) => {
                    setError(`Failed to parse CSV: ${error.message}`)
                    notifications.show({
                        title: 'CSV Parse Error',
                        message: error.message,
                        color: 'red',
                        icon: <IconX size={16} />,
                        autoClose: 5000,
                    })
                    setLoading(false)
                }
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read file')
            notifications.show({
                title: 'File Read Error',
                message: err instanceof Error ? err.message : 'Failed to read file',
                color: 'red',
                icon: <IconX size={16} />,
                autoClose: 5000,
            })
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
                        withCloseButton
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                <Box
                    style={{
                        border: '2px dashed #228be6',
                        borderRadius: '12px',
                        padding: '2rem',
                        backgroundColor: '#f1f8ff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                    }}
                >
                    <Stack gap="md" align="center">
                        <IconUpload size={40} stroke={1.5} color="#228be6" />
                        <FileInput
                            label="Choose a CSV file"
                            placeholder="Click to choose CSV file"
                            accept=".csv"
                            value={file}
                            onChange={handleFileChange}
                            disabled={loading}
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
                                    fontSize: '14px',
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
                        <Text size="xs">
                            Upload a CSV file with student information
                        </Text>
                    </Stack>
                </Box>

                {validating && (
                    <Alert icon={<Loader size={16} />} title="Validating..." color="blue">
                        Checking CSV format...
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

                <Alert icon={<IconInfoCircle />} title="Expected CSV Format" color="blue" variant="light">
                    <Text size="sm" mb="xs">
                        Your CSV file should include the following columns (case-insensitive):
                    </Text>
                    <List size="sm" spacing="xs">
                        <List.Item><strong>UTORid</strong> or <strong>username</strong> - Student identifier (required)</List.Item>
                        <List.Item><strong>givenName</strong> or <strong>firstName</strong> - First name (optional)</List.Item>
                        <List.Item><strong>familyName</strong> or <strong>lastName</strong> - Last name (optional)</List.Item>
                    </List>
                    <Text size="xs" mt="xs">
                        Example: UTORid,givenName,familyName
                    </Text>
                </Alert>

                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={onClose} disabled={loading} color="dark">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        loading={loading} 
                        disabled={!file || !validationStatus?.isValid}
                        leftSection={<IconUpload size={16} />}
                        color="dark"
                    >
                        Upload & Add Students
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}

export default AddStudentsModal

