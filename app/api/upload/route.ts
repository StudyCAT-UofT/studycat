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
 *   question_figure, biserial, average, attempts,
 *   irt_a, irt_b, irt_c (optional, defaults: 1.0 / 0.0 / 1/n_options),
 *   reference (optional)
 *   (answer_figure is not yet stored — see GitHub issue #68)
 * - courseId: Prisma Course.id (string)
 * - offeringId: Prisma CourseOffering.id (string)
 * - deactivateMissing: "true" to deactivate items not present in the file
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
        const deactivateMissing = formData.get("deactivateMissing") === "true";

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

        // Track all question IDs seen in the spreadsheet for deactivation
        const seenQuestionIds: string[] = [];

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
                const reference = row["reference"] != null ? String(row["reference"]) : null;
                const irtA = row["irt_a"] != null ? Number(row["irt_a"]) : 1.0;
                const irtB = row["irt_b"] != null ? Number(row["irt_b"]) : 0.0;
                const irtCRaw = row["irt_c"] != null ? Number(row["irt_c"]) : null;
                const correctRaw = row["correct_answer"];

                const externalQuestionId = externalQuestionIdRaw ? String(externalQuestionIdRaw) : null;
                const moduleNameStr = moduleName ? String(moduleName) : null;

                if (!moduleNameStr || !externalQuestionId) {
                    details.push({ externalQuestionId, status: "skipped: missing identifiers" });
                    continue;
                }

                seenQuestionIds.push(externalQuestionId);

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

                const irtC = irtCRaw ?? (1 / labels.length);

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

                // find or create module by (offeringId, name)
                let moduleRecord = await prisma.module.findFirst({
                    where: { offeringId: offeringId, name: moduleNameStr },
                });
                if (!moduleRecord) {
                    moduleRecord = await prisma.module.create({
                        data: { offeringId: offeringId, name: moduleNameStr },
                    });
                }

                // Check if item already exists for (courseId, externalQuestionId)
                const existing = await prisma.item.findFirst({
                    where: { courseId: courseId, externalQuestionId },
                    include: { options: true },
                });

                if (existing) {
                    // Diff check: only update if something actually changed
                    const newFigureUrl = figure ? String(figure) : null;
                    const itemChanged =
                        existing.moduleId !== moduleRecord!.id ||
                        existing.bloom !== bloom ||
                        existing.stem !== String(stem) ||
                        existing.reference !== reference ||
                        existing.figureUrl !== newFigureUrl ||
                        existing.ptBi !== ptBi ||
                        existing.average !== average ||
                        existing.attemptsCount !== attemptsCount ||
                        existing.irtA !== irtA ||
                        existing.irtB !== irtB ||
                        existing.irtC !== irtC ||
                        !existing.active;

                    // Check if options changed
                    const existingLabels = new Set(existing.options.map((o) => o.label));
                    const newLabels = new Set(optionsToCreate.map((o) => o.label));
                    const labelsMatch =
                        existingLabels.size === newLabels.size &&
                        [...existingLabels].every((l) => newLabels.has(l));

                    let optionsChanged = !labelsMatch;
                    if (!optionsChanged) {
                        // Labels match — check if any option content differs
                        for (const opt of optionsToCreate) {
                            const existingOpt = existing.options.find((o) => o.label === opt.label);
                            if (
                                !existingOpt ||
                                existingOpt.text !== opt.text ||
                                (existingOpt.justification ?? null) !== opt.justification ||
                                existingOpt.isCorrect !== opt.isCorrect
                            ) {
                                optionsChanged = true;
                                break;
                            }
                        }
                    }

                    if (!itemChanged && !optionsChanged) {
                        // Nothing changed — skip without updating
                        details.push({ externalQuestionId, status: "unchanged" });
                        continue;
                    }

                    // Update existing item in-place (preserves id and FK references)
                    const updatedItem = await prisma.$transaction(async (tx) => {
                        const item = await tx.item.update({
                            where: { id: existing.id },
                            data: {
                                moduleId: moduleRecord!.id,
                                bloom,
                                stem: String(stem),
                                reference,
                                figureUrl: newFigureUrl,
                                ptBi,
                                average,
                                attemptsCount,
                                irtA,
                                irtB,
                                irtC,
                                active: true, // re-activate if it was deactivated
                            },
                        });

                        // Upsert options by label to preserve option IDs where possible
                        const upsertedOptions = await Promise.all(
                            optionsToCreate.map((opt) => {
                                if (existingLabels.has(opt.label)) {
                                    const existingOpt = existing.options.find((o) => o.label === opt.label)!;
                                    return tx.itemOption.update({
                                        where: { id: existingOpt.id },
                                        data: {
                                            text: opt.text,
                                            justification: opt.justification,
                                            isCorrect: opt.isCorrect,
                                        },
                                    });
                                } else {
                                    return tx.itemOption.create({
                                        data: {
                                            itemId: existing.id,
                                            label: opt.label,
                                            text: opt.text,
                                            justification: opt.justification,
                                            isCorrect: opt.isCorrect,
                                        },
                                    });
                                }
                            })
                        );

                        // Delete options that are no longer in the spreadsheet
                        const labelsToDelete = [...existingLabels].filter((l) => !newLabels.has(l));
                        if (labelsToDelete.length > 0) {
                            await tx.itemOption.deleteMany({
                                where: {
                                    itemId: existing.id,
                                    label: { in: labelsToDelete },
                                },
                            });
                        }

                        return { ...item, options: upsertedOptions };
                    });

                    details.push({
                        externalQuestionId,
                        status: "updated",
                        itemId: updatedItem.id,
                        optionsCreated: updatedItem.options.length,
                    });
                    continue;
                }

                // create item and options
                const createdItem = await prisma.item.create({
                    data: {
                        courseId,
                        moduleId: moduleRecord.id,
                        externalQuestionId,
                        bloom,
                        stem: String(stem),
                        reference,
                        figureUrl: figure ? String(figure) : null,
                        ptBi,
                        average,
                        attemptsCount,
                        irtA,
                        irtB,
                        irtC,
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

        // Deactivate items not present in the spreadsheet (opt-in)
        if (deactivateMissing && seenQuestionIds.length > 0) {
            const itemsToDeactivate = await prisma.item.findMany({
                where: {
                    courseId,
                    active: true,
                    externalQuestionId: { notIn: seenQuestionIds },
                },
                select: { id: true, externalQuestionId: true },
            });

            if (itemsToDeactivate.length > 0) {
                await prisma.item.updateMany({
                    where: {
                        id: { in: itemsToDeactivate.map((i) => i.id) },
                    },
                    data: { active: false },
                });

                for (const item of itemsToDeactivate) {
                    details.push({
                        externalQuestionId: item.externalQuestionId,
                        status: "deactivated",
                    });
                }
            }
        }

        return NextResponse.json({ importedCount: details.length, details }, { status: 200 });
    } catch (error) {
        console.error("Failed to import spreadsheet:", error);
        return NextResponse.json({ error: "Failed to import spreadsheet", details: String(error) }, { status: 500 });
    }
}
