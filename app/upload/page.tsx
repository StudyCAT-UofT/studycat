'use client'

import React, { useState } from "react";
import {
    FileInput,
    Button,
    Switch,
    Modal,
    Text,
    Group,
    Paper,
    Table,
    LoadingOverlay,
    Box,
    Badge,
    ScrollArea,
    Alert,
    TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

type ImportResult = {
    success: boolean;
    importedCount?: number;
    errors?: string[];
    previewRows?: Array<Record<string, any>>;
};

export default function SpreadsheetImportMantine() {
    const [file, setFile] = useState<File | null>(null);
    const [courseId, setCourseId] = useState("");
    const [dryRun, setDryRun] = useState(true);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [message, setMessage] = useState<{ text: string; color: "red" | "green" | "yellow" } | null>(null);

    async function handleUpload() {
        if (!file) {
            setMessage({ text: "Please select a spreadsheet file.", color: "red" });
            return;
        }

        if (!courseId.trim()) {
            setMessage({ text: "Please enter a Course ID.", color: "red" });
            return;
        }

        setLoading(true);
        setResult(null);
        setMessage(null);

        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("courseId", courseId.trim());
            fd.append("dryRun", dryRun ? "1" : "0");

            const res = await fetch("/api/upload", {
                method: "POST",
                body: fd,
            });

            const json = (await res.json()) as ImportResult;

            if (!res.ok) {
                const msg =
                    (json && (json.errors?.join("; ") || "")) || `Import failed with status ${res.status}`;
                setMessage({ text: msg, color: "red" });
                setResult(json);
                setModalOpen(true);
            } else {
                setResult(json);
                setModalOpen(true);

                if (json.success) {
                    setMessage({
                        text: dryRun
                            ? `Preview successful: parsed ${json.importedCount ?? 0} item(s).`
                            : `Import complete: added ${json.importedCount ?? 0} item(s).`,
                        color: "green",
                    });
                } else {
                    setMessage({ text: "Import returned errors. See modal for details.", color: "yellow" });
                }
            }
        } catch (err: any) {
            setMessage({ text: `Network error: ${String(err?.message ?? err)}`, color: "red" });
            setResult({ success: false, errors: [String(err?.message ?? err)] });
            setModalOpen(true);
        } finally {
            setLoading(false);
        }
    }

    function renderPreview() {
        if (!result?.previewRows?.length) {
            return <Text>No preview rows returned by the API.</Text>;
        }

        const rows = result.previewRows;
        const cols = Object.keys(rows[0]).slice(0, 10);

        return (
            <ScrollArea style={{ height: 360 }}>
                <Table verticalSpacing="xs" striped highlightOnHover>
                    <thead>
                        <tr>
                            {cols.map((c) => (
                                <th key={c}>
                                    <Text size="xs" fw={700}>
                                        {c}
                                    </Text>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i}>
                                {cols.map((c) => (
                                    <td key={c}>
                                        <Text size="xs" lineClamp={2}>
                                            {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                                        </Text>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </ScrollArea>
        );
    }

    return (
        <Paper shadow="sm" p="md" radius="md" withBorder style={{ position: "relative" }}>
            <LoadingOverlay visible={loading} />

            <Group align="stretch" gap="md" grow>
                <FileInput
                    placeholder="Upload .xlsx or .xls"
                    label="Spreadsheet (exact format)"
                    accept=".xlsx,.xls"
                    value={file}
                    onChange={setFile}
                />

                <TextInput
                    label="Course ID"
                    placeholder=""
                    value={courseId}
                    onChange={(e) => setCourseId(e.currentTarget.value)}
                />

                <Group>
                    <Switch
                        label={dryRun ? "Dry run (preview)" : "Commit to DB"}
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.currentTarget.checked)}
                    />
                    {courseId && (
                        <Badge color="blue" variant="light">
                            {courseId}
                        </Badge>
                    )}
                </Group>

                <Group>
                    <Button variant="default" onClick={() => { setFile(null); setResult(null); setMessage(null); }}>
                        Clear
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || !courseId.trim()} loading={loading}>
                        {dryRun ? "Preview" : "Import"}
                    </Button>
                </Group>

                {message && (
                    <Alert
                        color={message.color}
                        icon={message.color === "green" ? <IconCheck size={18} /> : <IconAlertCircle size={18} />}
                        variant="light"
                    >
                        {message.text}
                    </Alert>
                )}

                <Box>
                    <Text size="xs" c="dimmed">
                        Tip: Enter the Course ID and do a dry run first to verify parsing and bolded correct answers.
                    </Text>
                </Box>
            </Group>

            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={dryRun ? "Preview Results" : "Import Results"}
                size="xl"
            >
                <Group align="stretch">
                    {result?.success ? (
                        <Text fw={700}>
                            {dryRun
                                ? `Parsed ${result.importedCount ?? 0} item(s).`
                                : `Imported ${result.importedCount ?? 0} item(s).`}
                        </Text>
                    ) : (
                        <Text c="red" fw={700}>
                            Import encountered problems
                        </Text>
                    )}

                    {result?.errors && result.errors.length > 0 && (
                        <Paper withBorder p="sm" radius="sm">
                            <Text fw={700} size="sm">
                                Errors ({result.errors.length})
                            </Text>
                            <ul>
                                {result.errors.map((e, i) => (
                                    <li key={i}>
                                        <Text size="sm">{e}</Text>
                                    </li>
                                ))}
                            </ul>
                        </Paper>
                    )}

                    {result?.previewRows ? renderPreview() : <Text size="sm">No preview data available.</Text>}

                    <Group mt="md">
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Close
                        </Button>
                    </Group>
                </Group>
            </Modal>
        </Paper>
    );
}
