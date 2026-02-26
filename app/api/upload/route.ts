// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { BloomCategory } from '@/types'

export const runtime = "nodejs";

/**
 * POST /api/upload
 *
 * Accepts two spreadsheet formats:
 *
 * NEW FORMAT (primary — Quizzical export):
 *   lecture, question_id, category, question, correct_answer,
 *   answer_a..answer_z (flexible count), answer_justification_a..z,
 *   question_figure, biserial, average, attempts,
 *   [ignored: index, submission_date, rating, author_name]
 *   [not yet stored: answer_figure (answer-side figure, one per question) — see GitHub issue #68]
 *
 * LEGACY FORMAT (fallback — internal spreadsheet):
 *   Module, Question_ID, Bloom_Cat, Stem, Response_A..D, Correct,
 *   [optional: Justification_A..D, Reference, Figure, PtBi, Average, Attempts, IRT_a/b/c]
 *
 * Format is auto-detected from column headers. No user action required.
 *
 * Expects multipart/form-data with:
 * - file: the .xlsx or .csv spreadsheet (first sheet is used)
 * - courseId: Prisma Course.id (string)
 * - offeringId: Prisma CourseOffering.id (string)
 *
 * Returns:
 * - 200: { format, importedCount, details: [...] }
 * - 400: missing params / invalid file
 * - 500: server error
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpreadsheetFormat = 'new' | 'legacy';

interface ParsedRow {
    moduleName: unknown;
    externalQuestionId: unknown;
    bloomRaw: unknown;
    stem: unknown;
    figureUrl: unknown;
    ptBi: number | null;
    average: number | null;
    attemptsCount: number | null;
    irtA: number;
    irtB: number;
    irtC: number;
    correctRaw: unknown;
    options: Array<{ label: string; text: string; justif: string | null }>;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

function detectFormat(headers: string[]): SpreadsheetFormat {
    // New format signature: must have all three of these columns
    if (headers.includes('question') && headers.includes('lecture') && headers.includes('correct_answer')) {
        return 'new';
    }
    // Everything else falls back to legacy
    return 'legacy';
}

// ---------------------------------------------------------------------------
// Bloom mapping (shared)
// ---------------------------------------------------------------------------

const mapBloom = (raw: unknown): BloomCategory | undefined => {
    if (raw == null) return undefined;
    const s = String(raw).trim().toUpperCase();
    const BloomKeys = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
    if (BloomKeys.includes(s)) return s as BloomCategory;
    if (s.startsWith("REC")) return "REMEMBER";   // "Recall"
    if (s.startsWith("UND")) return "UNDERSTAND"; // "Understanding"
    if (s.startsWith("APP")) return "APPLY";       // "Application"
    if (s.startsWith("ANA")) return "ANALYZE";     // "Analysis"
    if (s.startsWith("EVA")) return "EVALUATE";    // "Evaluation"
    if (s.startsWith("CRE")) return "CREATE";      // "Creation"
    if (s.startsWith("COM")) return "UNDERSTAND";  // "Comprehension" (legacy Bloom taxonomy)
    if (s.startsWith("KNO")) return "REMEMBER";    // "Knowledge" (legacy Bloom taxonomy)
    if (s.startsWith("SYN")) return "CREATE";      // "Synthesis" (legacy Bloom taxonomy)
    return undefined;
};

// ---------------------------------------------------------------------------
// Correctness check (shared)
// ---------------------------------------------------------------------------

function isCorrectOption(label: string, correctRaw: unknown): boolean {
    if (correctRaw == null) return false;
    const c = String(correctRaw).trim();
    // Single-letter match: "A", "B", "a", "b", etc.
    if (/^[A-Za-z]$/.test(c)) return c.toUpperCase() === label.toUpperCase();
    // Full-text match (legacy format only): exact string equality
    return false;
}

// ---------------------------------------------------------------------------
// New format: dynamic option scanning
// ---------------------------------------------------------------------------

function scanNewFormatOptions(
    row: Record<string, unknown>
): Array<{ label: string; text: string; justif: string | null }> {
    const options: Array<{ label: string; text: string; justif: string | null }> = [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of alphabet) {
        const key = `answer_${letter.toLowerCase()}`;
        if (row[key] == null) {
            // Stop at first missing option after we have found at least one
            if (options.length > 0) break;
            continue;
        }
        const justifKey = `answer_justification_${letter.toLowerCase()}`;
        options.push({
            label: letter,
            text: String(row[key]),
            justif: row[justifKey] != null ? String(row[justifKey]) : null,
        });
    }
    return options;
}

// ---------------------------------------------------------------------------
// New format parser
// ---------------------------------------------------------------------------

function parseNewFormatRow(row: Record<string, unknown>): ParsedRow {
    return {
        moduleName:         row['lecture'],
        externalQuestionId: row['question_id'],
        bloomRaw:           row['category'],
        stem:               row['question'] ?? '',
        figureUrl:          row['question_figure'] ?? null,
        // answer_figure (one figure per question, shown on the answer/explanation side) is not yet stored.
        // Item schema lacks answerFigureUrl. See GitHub issue #68
        ptBi:         row['biserial'] != null ? Number(row['biserial']) : null,
        average:      row['average']  != null ? Number(row['average'])  : null,
        attemptsCount: row['attempts'] != null ? parseInt(String(row['attempts']), 10) : null,
        irtA: 0, irtB: 0, irtC: 0, // Not present in new format — defaults to 0
        correctRaw:   row['correct_answer'],
        options:      scanNewFormatOptions(row),
    };
}

// ---------------------------------------------------------------------------
// Legacy format parser
// ---------------------------------------------------------------------------

function parseLegacyFormatRow(row: Record<string, unknown>): ParsedRow {
    const options = (['a', 'b', 'c', 'd'] as const).map((l) => ({
        label: l.toUpperCase(),
        text: String(row[`response_${l}`] ?? ''),
        justif: row[`justification_${l}`] != null ? String(row[`justification_${l}`]) : null,
    }));

    return {
        moduleName:         row['module'] || row['module name'] || row['module_name'],
        externalQuestionId: row['question_id'] || row['question id'] || row['questionid'],
        bloomRaw:           row['bloom_cat'] || row['bloom cat'] || row['bloom'],
        stem:               row['stem'] ?? '',
        figureUrl:          row['figure'] ?? null,
        ptBi:         row['ptbi']    != null ? Number(row['ptbi'])    : null,
        average:      row['average'] != null ? Number(row['average']) : null,
        attemptsCount: row['attempts'] != null ? parseInt(String(row['attempts']), 10) : null,
        irtA: row['irt_a'] != null ? Number(row['irt_a']) : 0,
        irtB: row['irt_b'] != null ? Number(row['irt_b']) : 0,
        irtC: row['irt_c'] != null ? Number(row['irt_c']) : 0,
        correctRaw:   row['correct'],
        options,
    };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
    try {
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Content-Type must be multipart/form-data" }, { status: 400 });
        }

        const formData = await request.formData();
        const courseIdRaw = formData.get("courseId");
        const offeringIdRaw = formData.get("offeringId");
        const file = formData.get("file") as File | null;

        if (!courseIdRaw || !offeringIdRaw) {
            return NextResponse.json({ error: "courseId and offeringId are required" }, { status: 400 });
        }
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const courseId = String(courseIdRaw);
        const offeringId = String(offeringIdRaw);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return NextResponse.json({ error: "Uploaded workbook contains no sheets" }, { status: 400 });
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];

        const normalizeHeader = (h: string) => h?.toString().trim().toLowerCase();

        // Normalize all keys to lowercase once
        const parsedRows = rawRows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(r)) {
                out[normalizeHeader(key)] = r[key];
            }
            return out;
        });

        if (parsedRows.length === 0) {
            return NextResponse.json({ error: "Spreadsheet is empty" }, { status: 400 });
        }

        // Detect format from headers of the first row
        const headers = Object.keys(parsedRows[0]);
        const format = detectFormat(headers);

        type DetailResult =
            | { externalQuestionId: string | null; status: string }
            | { externalQuestionId: string; status: string; itemId: string; optionsCreated: number }
            | { status: string; error: string };
        const details: DetailResult[] = [];

        for (const row of parsedRows) {
            try {
                const parsed = format === 'new' ? parseNewFormatRow(row) : parseLegacyFormatRow(row);

                const externalQuestionId = parsed.externalQuestionId ? String(parsed.externalQuestionId) : null;
                const moduleNameStr = parsed.moduleName ? String(parsed.moduleName) : null;

                if (!moduleNameStr || !externalQuestionId) {
                    details.push({ externalQuestionId, status: "skipped: missing identifiers" });
                    continue;
                }

                const bloom = mapBloom(parsed.bloomRaw);
                if (!bloom) {
                    details.push({ externalQuestionId, status: "skipped: invalid bloom category" });
                    continue;
                }

                if (parsed.options.length === 0) {
                    details.push({ externalQuestionId, status: "skipped: no answer options found" });
                    continue;
                }

                // Find or create module
                let moduleRecord = await prisma.module.findFirst({
                    where: { offeringId, name: moduleNameStr },
                });
                if (!moduleRecord) {
                    moduleRecord = await prisma.module.create({
                        data: { offeringId, name: moduleNameStr },
                    });
                }

                // Skip duplicates
                const existing = await prisma.item.findFirst({
                    where: { courseId, externalQuestionId },
                });
                if (existing) {
                    details.push({ externalQuestionId, status: "skipped: already exists" });
                    continue;
                }

                // Build options (flexible count)
                const optionsToCreate = parsed.options.map((opt) => ({
                    label: opt.label,
                    text: opt.text,
                    justification: opt.justif,
                    isCorrect: isCorrectOption(opt.label, parsed.correctRaw),
                }));

                const createdItem = await prisma.item.create({
                    data: {
                        courseId,
                        moduleId: moduleRecord.id,
                        externalQuestionId,
                        bloom,
                        stem: String(parsed.stem),
                        reference: null,
                        figureUrl: parsed.figureUrl ? String(parsed.figureUrl) : null,
                        ptBi: parsed.ptBi,
                        average: parsed.average,
                        attemptsCount: parsed.attemptsCount,
                        irtA: parsed.irtA,
                        irtB: parsed.irtB,
                        irtC: parsed.irtC,
                        active: true,
                        options: {
                            create: optionsToCreate,
                        },
                    },
                    include: { options: true },
                });

                details.push({
                    externalQuestionId,
                    status: "created",
                    itemId: createdItem.id,
                    optionsCreated: createdItem.options.length,
                });
            } catch (rowErr) {
                console.error("Row import failed:", rowErr);
                details.push({ status: "error", error: String(rowErr) });
            }
        }

        return NextResponse.json({ format, importedCount: details.length, details }, { status: 200 });
    } catch (error) {
        console.error("Failed to import spreadsheet:", error);
        return NextResponse.json({ error: "Failed to import spreadsheet", details: String(error) }, { status: 500 });
    }
}
