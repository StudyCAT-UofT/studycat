// app/api/upload-spreadsheet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { BloomCategory } from '@/types'

export const runtime = "nodejs";

/**
 * POST /api/upload
 *
 * Expects multipart/form-data with:
 * - file: the .xlsx or .csv spreadsheet (first sheet is used)
 *   Columns: lecture, question_id, category, question, correct_answer,
 *   answer_a/b/c/... (flexible count), answer_justification_a/b/c/...,
 *   question_figure, biserial, average, attempts
 *   (answer_figure is not yet stored — see GitHub issue #68)
 * - courseId: Prisma Course.id (string)
 * - offeringId: Prisma CourseOffering.id (string)
 *
 * Returns:
 * - 200: { importedCount, details: [...] }
 * - 400: missing params / invalid file
 * - 500: server error
 */
export async function POST(request: Request) {
    try {
        // Ensure Content-Type is form-data
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

        // Read uploaded file into buffer and parse via xlsx
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
            return NextResponse.json({ error: "Uploaded workbook contains no sheets" }, { status: 400 });
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];

        // helpers
        const normalizeHeader = (h: string) => h?.toString().trim().toLowerCase();

        const mapBloom = (raw: unknown): BloomCategory | undefined => {
            if (raw == null) return undefined;
            const s = String(raw).trim().toUpperCase();
            // direct match
            const BloomKeys = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
            if (BloomKeys.includes(s)) return s as BloomCategory;
            if (s.startsWith("REC")) return "REMEMBER";
            if (s.startsWith("UND")) return "UNDERSTAND";
            if (s.startsWith("APP")) return "APPLY";
            if (s.startsWith("ANA")) return "ANALYZE";
            if (s.startsWith("EVA")) return "EVALUATE";
            if (s.startsWith("CRE")) return "CREATE";
            return undefined;
        };

        // Normalize keys on rows so we can reference case-insensitively
        const parsedRows = rawRows.map((r) => {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(r)) {
                out[normalizeHeader(key)] = r[key];
            }
            return out;
        });

        type DetailResult =
            | { externalQuestionId: string | null; status: string }
            | { externalQuestionId: string; status: string; itemId: string; optionsCreated: number }
            | { status: string; error: string };
        const details: DetailResult[] = [];

        // process rows sequentially (keeps DB small-batch friendly and easy to reason about)
        for (const row of parsedRows) {
            try {
                const moduleName = row["lecture"];
                const externalQuestionIdRaw = row["question_id"];
                const bloomRaw = row["category"];
                const stem = row["question"] ?? "";
                const figure = row["question_figure"] ?? null;
                // answer_figure is not yet stored — see GitHub issue #68
                const ptBi = row["biserial"] != null ? Number(row["biserial"]) : null;
                const average = row["average"] != null ? Number(row["average"]) : null;
                const attemptsCount = row["attempts"] != null ? parseInt(String(row["attempts"]), 10) : null;
                const correctRaw = row["correct_answer"];

                const externalQuestionId = externalQuestionIdRaw ? String(externalQuestionIdRaw) : null;
                const moduleNameStr = moduleName ? String(moduleName) : null;

                if (!moduleNameStr || !externalQuestionId) {
                    details.push({ externalQuestionId, status: "skipped: missing identifiers" });
                    continue;
                }

                const bloom = mapBloom(bloomRaw);
                if (!bloom) {
                    details.push({ externalQuestionId, status: "skipped: invalid bloom category" });
                    continue;
                }

                // prepare responses (answer_a, answer_b, ... — flexible count)
                const labels: string[] = [];
                const responses: unknown[] = [];
                const justifs: unknown[] = [];
                for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
                    const key = `answer_${letter.toLowerCase()}`;
                    if (row[key] == null && labels.length > 0) break;
                    if (row[key] != null) {
                        labels.push(letter);
                        responses.push(row[key]);
                        justifs.push(row[`answer_justification_${letter.toLowerCase()}`] ?? null);
                    }
                }

                if (labels.length === 0) {
                    details.push({ externalQuestionId, status: "skipped: no answer options found" });
                    continue;
                }

                // find or create module by (offeringId, name)
                let moduleRecord = await prisma.module.findFirst({
                    where: { offeringId: offeringId, name: moduleNameStr },
                });
                if (!moduleRecord) {
                    moduleRecord = await prisma.module.create({
                        data: { offeringId: offeringId, name: moduleNameStr },
                    });
                }

                // skip if item already exists for (courseId, externalQuestionId)
                const existing = await prisma.item.findFirst({
                    where: { courseId: courseId, externalQuestionId },
                });
                if (existing) {
                    details.push({ externalQuestionId, status: "skipped: already exists" });
                    continue;
                }

                // Build options, mark correct by letter (A/B/C/...)
                const optionsToCreate: Array<{
                    label: string;
                    text: string;
                    justification: string | null;
                    isCorrect: boolean;
                }> = [];
                for (let i = 0; i < labels.length; i++) {
                    const text = responses[i] ?? "";
                    const justification = justifs[i] ?? null;
                    const label = labels[i];
                    let isCorrect = false;

                    if (correctRaw != null) {
                        const c = String(correctRaw).trim();
                        if (/^[A-Za-z]$/.test(c)) {
                            if (c.toUpperCase() === label) isCorrect = true;
                        }
                    }

                    optionsToCreate.push({
                        label,
                        text: String(text),
                        justification: justification ? String(justification) : null,
                        isCorrect,
                    });
                }

                // create item and options
                const createdItem = await prisma.item.create({
                    data: {
                        courseId,
                        moduleId: moduleRecord.id,
                        externalQuestionId,
                        bloom,
                        stem: String(stem),
                        reference: null,
                        figureUrl: figure ? String(figure) : null,
                        ptBi,
                        average,
                        attemptsCount,
                        irtA: 0,
                        irtB: 0,
                        irtC: 0,
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
                // Row-level failure — record and continue
                console.error("Row import failed:", rowErr);
                details.push({ status: "error", error: String(rowErr) });
            }
        } // end rows loop

        return NextResponse.json({ importedCount: details.length, details }, { status: 200 });
    } catch (error) {
        console.error("Failed to import spreadsheet:", error);
        return NextResponse.json({ error: "Failed to import spreadsheet", details: String(error) }, { status: 500 });
    }
}
