// app/api/upload-spreadsheet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";
import { BloomCategory } from '@/types'
import { parseQtiBuffer, formatQuestions, QuestionObj } from "@/lib/qti-parser";

class UploadValidationError extends Error {}

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
 *   reference (optional),
 *   status (optional: "active" | "inactive", defaults to "active")
 *   (answer_figure is not yet stored — see GitHub issue #68)
 * - courseId: Prisma Course.id (string)
 * - offeringId: Prisma CourseOffering.id (string)
 * - deactivateMissing: "true" to deactivate items not present in the file
 * - dryRun: "true" to preview changes without writing to the DB
 * - approvedQuestionIds: JSON array of externalQuestionIds to create/update (commit step)
 * - deactivateIds: JSON array of DB item IDs to deactivate (commit step)
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
        const dryRun = formData.get("dryRun") === "true";

        // Parse approved lists for the commit step
        let approvedQuestionIds: string[] | null = null;
        let deactivateIds: string[] | null = null;
        const approvedQuestionIdsRaw = formData.get("approvedQuestionIds");
        const deactivateIdsRaw = formData.get("deactivateIds");
        try {
            if (approvedQuestionIdsRaw != null) {
                approvedQuestionIds = JSON.parse(String(approvedQuestionIdsRaw)) as string[];
            }
            if (deactivateIdsRaw != null) {
                deactivateIds = JSON.parse(String(deactivateIdsRaw)) as string[];
            }
        } catch {
            return NextResponse.json({ error: "Invalid JSON in approvedQuestionIds or deactivateIds" }, { status: 400 });
        }

        if (!courseIdRaw || !offeringIdRaw) {
            return NextResponse.json({ error: "courseId and offeringId are required" }, { status: 400 });
        }
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const courseId = String(courseIdRaw);
        const offeringId = String(offeringIdRaw);

        const rawRows = await parseUploadedFile(file);

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
            | { externalQuestionId: string; status: string; itemId: string; optionsCreated: number; moduleName?: string; bloom?: string; stem?: string; diff?: Record<string, { old: unknown; new: unknown }> }
            | { externalQuestionId: string; status: "deactivated"; itemId: string; moduleName?: string; bloom?: string; stem?: string }
            | { status: string; error: string };
        const details: DetailResult[] = [];

        // Track all question IDs seen in the spreadsheet for deactivation
        const seenQuestionIds: string[] = [];
        const seenIds = new Set<string>(); // tracks seen question ids for new quizzes to prevent duplicates
        const seenQuestionContents = new Set<string>(); // tracks seen questions (question text, answer options, feedback) for classic quizzes to prevent duplicates

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

                // Parse optional status column: absent or blank → active; "inactive" → false
                const statusRaw = row["status"];
                const itemActive = statusRaw == null || String(statusRaw).trim().toLowerCase() !== "inactive";

                const externalQuestionId = externalQuestionIdRaw ? String(externalQuestionIdRaw) : null;
                const moduleNameStr = moduleName ? String(moduleName) : null;

                if (!moduleNameStr || !externalQuestionId || !stem) {
                    details.push({ externalQuestionId, status: "skipped: missing identifiers" });
                    continue;
                }

                // Always track seen IDs (even if not approved) so deactivation logic is correct
                seenQuestionIds.push(externalQuestionId);

                // If approvedQuestionIds is provided, skip rows not in the approved list
                if (approvedQuestionIds !== null && !approvedQuestionIds.includes(externalQuestionId)) {
                    details.push({ externalQuestionId, status: "skipped: not approved" });
                    continue;
                }

                const bloom = mapBloom(bloomRaw) ?? "REMEMBER"; // Default is set to "REMEMBER" for now
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

                if (labels.length < 2 || labels.length > 26) {
                    details.push({ externalQuestionId, status: "skipped: impermissible number of answer options (must be between 2 and 26)" });
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
                        if (Array.isArray(correctRaw)) {
                            isCorrect = correctRaw.some((c) => String(c).trim().toUpperCase() === label);
                        } else {
                            const c = String(correctRaw).trim();
                            if (/^[A-Za-z]$/.test(c)) {
                                if (c.toUpperCase() === label) isCorrect = true;
                            }
                        }
                    }

                    optionsToCreate.push({
                        label,
                        text: String(text),
                        justification: justification ? String(justification) : null,
                        isCorrect,
                    });
                }

                const seenAnswerTexts = new Set<string>();
                for (const opt of optionsToCreate) {
                    if (seenAnswerTexts.has(opt.text)) {
                        details.push({ externalQuestionId, status: "skipped: duplicate answer options" });
                        break;
                    }
                    seenAnswerTexts.add(opt.text);
                }

                if (seenAnswerTexts.size < optionsToCreate.length) continue; 

                if (!optionsToCreate.some(o => o.isCorrect)) {
                    details.push({ externalQuestionId, status: "skipped: no correct answer specified" });
                    continue;
                }

                if (seenIds.has(externalQuestionId)) {
                    details.push({ externalQuestionId, status: "skipped: duplicate question ID" });
                    continue;
                }
                seenIds.add(externalQuestionId);

                const ansString = optionsToCreate.map(option => {
                    return `(${option.text},${option.justification})`;
                });

                const questionContent = `${String(stem)},${String(figure)},${ansString.sort().join(",")}`;

                if (seenQuestionContents.has(questionContent)) {
                    details.push({ externalQuestionId, status: "skipped: duplicate question content" });
                    continue;
                }
                seenQuestionContents.add(questionContent);

                // find or create module by (offeringId, name)
                let moduleRecord = await prisma.module.findFirst({
                    where: { offeringId: offeringId, name: moduleNameStr },
                });
                if (!moduleRecord) {
                    if (!dryRun) {
                        moduleRecord = await prisma.module.create({
                            data: { offeringId: offeringId, name: moduleNameStr },
                        });
                    } else {
                        // Synthesize a placeholder so the rest of the row logic runs
                        moduleRecord = { id: "__dryrun__", offeringId, name: moduleNameStr, createdAt: new Date() };
                    }
                }

                // Check if item already exists for (courseId, externalQuestionId)
                const existing = await prisma.item.findFirst({
                    where: { courseId: courseId, externalQuestionId },
                    include: { options: true, module: { select: { name: true } } },
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
                        existing.active !== itemActive;

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

                    if (dryRun) {
                        const newFigureUrlDryRun = figure ? String(figure) : null;
                        const diff: Record<string, { old: unknown; new: unknown }> = {};
                        if (existing.module.name !== moduleNameStr)
                            diff["module"] = { old: existing.module.name, new: moduleNameStr };
                        if (existing.bloom !== bloom)
                            diff["bloom"] = { old: existing.bloom, new: bloom };
                        if (existing.stem !== String(stem))
                            diff["stem"] = { old: existing.stem, new: String(stem) };
                        if (existing.reference !== reference)
                            diff["reference"] = { old: existing.reference, new: reference };
                        if (existing.figureUrl !== newFigureUrlDryRun)
                            diff["figureUrl"] = { old: existing.figureUrl, new: newFigureUrlDryRun };
                        if (existing.ptBi !== ptBi)
                            diff["biserial"] = { old: existing.ptBi, new: ptBi };
                        if (existing.average !== average)
                            diff["average"] = { old: existing.average, new: average };
                        if (existing.attemptsCount !== attemptsCount)
                            diff["attempts"] = { old: existing.attemptsCount, new: attemptsCount };
                        if (existing.irtA !== irtA)
                            diff["irt_a"] = { old: existing.irtA, new: irtA };
                        if (existing.irtB !== irtB)
                            diff["irt_b"] = { old: existing.irtB, new: irtB };
                        if (existing.irtC !== irtC)
                            diff["irt_c"] = { old: existing.irtC, new: irtC };
                        if (existing.active !== itemActive)
                            diff["status"] = { old: existing.active ? "active" : "inactive", new: itemActive ? "active" : "inactive" };
                        if (optionsChanged) {
                            // Removed options
                            for (const existingOpt of existing.options) {
                                if (!optionsToCreate.find(o => o.label === existingOpt.label)) {
                                    diff[`opt_${existingOpt.label}`] = { old: existingOpt.text, new: "(removed)" };
                                }
                            }
                            // Added or changed options
                            for (const opt of optionsToCreate) {
                                const existingOpt = existing.options.find(o => o.label === opt.label);
                                if (!existingOpt) {
                                    diff[`opt_${opt.label}`] = { old: "(added)", new: opt.text };
                                } else if (existingOpt.text !== opt.text) {
                                    diff[`opt_${opt.label}`] = { old: existingOpt.text, new: opt.text };
                                } else if (existingOpt.isCorrect !== opt.isCorrect) {
                                    diff[`opt_${opt.label}`] = { old: existingOpt.isCorrect ? "correct" : "incorrect", new: opt.isCorrect ? "correct" : "incorrect" };
                                } else if ((existingOpt.justification ?? null) !== opt.justification) {
                                    diff[`opt_${opt.label} justif`] = { old: existingOpt.justification ?? "(none)", new: opt.justification ?? "(none)" };
                                }
                            }
                        }
                        details.push({
                            externalQuestionId,
                            status: "updated",
                            itemId: existing.id,
                            optionsCreated: optionsToCreate.length,
                            moduleName: moduleNameStr,
                            bloom,
                            stem: String(stem),
                            diff,
                        });
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
                                active: itemActive,
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

                // New item
                if (dryRun) {
                    details.push({
                        externalQuestionId,
                        status: "created",
                        itemId: "__new__",
                        optionsCreated: optionsToCreate.length,
                        moduleName: moduleNameStr,
                        bloom,
                        stem: String(stem),
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
                        active: itemActive,
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

        if (deactivateIds !== null) {
            // Commit path: deactivate only the explicitly approved item IDs
            if (deactivateIds.length > 0 && !dryRun) {
                await prisma.item.updateMany({
                    where: { id: { in: deactivateIds } },
                    data: { active: false },
                });
                const deactivated = await prisma.item.findMany({
                    where: { id: { in: deactivateIds } },
                    select: { id: true, externalQuestionId: true, bloom: true, stem: true, module: { select: { name: true } } },
                });
                for (const item of deactivated) {
                    details.push({ externalQuestionId: item.externalQuestionId, status: "deactivated", itemId: item.id, moduleName: item.module.name, bloom: item.bloom, stem: item.stem });
                }
            }
        } else if (deactivateMissing && seenQuestionIds.length > 0) {
            // Dry-run preview or direct-commit (no approvedQuestionIds provided)
            const itemsToDeactivate = await prisma.item.findMany({
                where: {
                    courseId,
                    active: true,
                    externalQuestionId: { notIn: seenQuestionIds },
                },
                select: { id: true, externalQuestionId: true, bloom: true, stem: true, module: { select: { name: true } } },
            });

            if (itemsToDeactivate.length > 0) {
                if (!dryRun) {
                    await prisma.item.updateMany({
                        where: {
                            id: { in: itemsToDeactivate.map((i) => i.id) },
                        },
                        data: { active: false },
                    });
                }

                for (const item of itemsToDeactivate) {
                    details.push({
                        externalQuestionId: item.externalQuestionId,
                        status: "deactivated",
                        itemId: item.id,
                        moduleName: item.module.name,
                        bloom: item.bloom,
                        stem: item.stem,
                    });
                }
            }
        }

        return NextResponse.json({ importedCount: details.length, details }, { status: 200 });
    } catch (error) {
        if (error instanceof UploadValidationError) {
            return NextResponse.json({ error: String(error.message) }, { status: 400 });
        }
        console.error("Failed to import spreadsheet:", error);
        return NextResponse.json({ error: "Failed to import spreadsheet", details: String(error) }, { status: 500 });
    }
}

async function parseUploadedFile (file: File): Promise<Record<string, unknown>[]> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name?.toLowerCase() ?? "";

    const isXmlExt = (fileName.endsWith(".xml") || fileName.endsWith(".qti"));
    const isXlsxExt = (fileName.endsWith(".xlsx"));
    const isXlsExt = (fileName.endsWith(".xls"));
    const isCsvExt = (fileName.endsWith(".csv"));

    const isXlsxMagicNum = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    const isXlsMagicNum  = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;

    const textSnippet = buffer.subarray(0, 256).toString("utf8").trim();
    const isXmlMagicNum = textSnippet.startsWith("<?xml") && textSnippet.includes("<questestinterop");

    if (isXmlExt && !isXmlMagicNum) throw new UploadValidationError("File extension suggests QTI format but file content does not match");
    if (isXmlMagicNum && !isXmlExt) throw new UploadValidationError("File content suggests QTI format but file extension does not match");
    if (isXlsxExt && !isXlsxMagicNum) throw new UploadValidationError("File extension suggests XLSX format but file content does not match");
    if (isXlsxMagicNum && !isXlsxExt && !isCsvExt) throw new UploadValidationError("File content suggests XLSX format but file extension does not match");
    if (isXlsExt && !isXlsMagicNum) throw new UploadValidationError("File extension suggests XLS format but file content does not match.");
    if (isXlsMagicNum && !isXlsExt) throw new UploadValidationError("File content suggests XLS format but file extension does not match.");

    if (isXmlExt && isXmlMagicNum) {
        try {
            const { questions } = await parseQtiBuffer(buffer, null); // const { questions, itemBanks } = await parseQtiBuffer(buffer, null) - then loop to parse item banks when zip file upload is supported
            const formatted = formatQuestions(questions);
            return toFlatRows(formatted);
        } catch (parserError: any) {
            throw new UploadValidationError(`Invalid QTI file structure. Ensure your file follows QTI standards and all questions have the required attributes. `);
        }
    }

    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error("Uploaded workbook contains no sheets");
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];

    return rawRows;
}

function toFlatRows(questions: QuestionObj[]): Record<string, unknown>[] {
    return questions.map((q) => {
        const row: Record<string, unknown> = {
            lecture: q.moduleTitle,
            question_id: q.questionId,
            question: q.questionTitle,
            correct_answer: q.correctAnsLetters,
        };

        for (const [key, option] of Object.entries(q.answerOptions)) {
            row[key] = option.answerText;
            row[`answer_justification_${option.answerLetter.toLowerCase()}`] = option.justification;
        }

        return row;
    })
}
