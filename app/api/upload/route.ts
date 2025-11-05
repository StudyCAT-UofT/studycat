// app/api/upload-spreadsheet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const runtime = "nodejs";

/**
 * POST /api/upload-spreadsheet
 *
 * Expects multipart/form-data with:
 * - file: the .xlsx spreadsheet (first sheet is used)
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
        const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: null });

        // helpers
        const normalizeHeader = (h: string) => h?.toString().trim().toLowerCase();

        const mapBloom = (raw: any) => {
            if (raw == null) return undefined;
            const s = String(raw).trim().toUpperCase();
            // direct match
            const BloomKeys = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
            if (BloomKeys.includes(s)) return s;
            if (s.startsWith("REC")) return "REMEMBER";
            if (s.startsWith("UND")) return "UNDERSTAND";
            if (s.startsWith("APP")) return "APPLY";
            if (s.startsWith("ANA")) return "ANALYZE";
            if (s.startsWith("EVA")) return "EVALUATE";
            if (s.startsWith("CRE")) return "CREATE";
            return undefined;
        };

        const labelFromIndex = (i: number) => {
            switch (i) {
                case 0: return "A";
                case 1: return "B";
                case 2: return "C";
                default: return "D";
            }
        };

        // Normalize keys on rows so we can reference case-insensitively
        const parsedRows = rawRows.map((r) => {
            const out: Record<string, any> = {};
            for (const key of Object.keys(r)) {
                out[normalizeHeader(key)] = r[key];
            }
            return out;
        });

        const details: any[] = [];

        // process rows sequentially (keeps DB small-batch friendly and easy to reason about)
        for (const row of parsedRows) {
            try {
                const moduleName = row["module"] || row["module name"] || row["module_name"];
                const externalQuestionId = row["question_id"] || row["question id"] || row["questionid"];
                const bloomRaw = row["bloom_cat"] || row["bloom cat"] || row["bloom"];
                const stem = row["stem"] ?? "";
                const reference = row["reference"] ?? null;
                const figure = row["figure"] ?? null;
                const ptBi = row["ptbi"] != null ? Number(row["ptbi"]) : null;
                const average = row["average"] != null ? Number(row["average"]) : null;
                const attemptsCount = row["attempts"] != null ? parseInt(String(row["attempts"]), 10) : null;
                const irtA = row["irt_a"] != null ? Number(row["irt_a"]) : 0;
                const irtB = row["irt_b"] != null ? Number(row["irt_b"]) : 0;
                const irtC = row["irt_c"] != null ? Number(row["irt_c"]) : 0;
                const correctRaw = row["correct"]; // required by user note (always present)

                if (!moduleName || !externalQuestionId) {
                    details.push({ externalQuestionId: externalQuestionId ?? null, status: "skipped: missing identifiers" });
                    continue;
                }

                const bloom = mapBloom(bloomRaw);

                // prepare responses (case-insensitive header names accepted)
                const responses = [
                    row["response_a"],
                    row["response_b"],
                    row["response_c"],
                    row["response_d"],
                ];
                const justifs = [
                    row["justification_a"],
                    row["justification_b"],
                    row["justification_c"],
                    row["justification_d"],
                ];

                // find or create module by (offeringId, name)
                let moduleRecord = await prisma.module.findFirst({
                    where: { offeringId: offeringId, name: String(moduleName) },
                });
                if (!moduleRecord) {
                    moduleRecord = await prisma.module.create({
                        data: { offeringId: offeringId, name: String(moduleName) },
                    });
                }

                // skip if item already exists for (courseId, externalQuestionId)
                const existing = await prisma.item.findFirst({
                    where: { courseId: courseId, externalQuestionId: String(externalQuestionId) },
                });
                if (existing) {
                    details.push({ externalQuestionId: externalQuestionId, status: "skipped: already exists" });
                    continue;
                }

                // Build options, mark correct by either A/B/C/D or by matching option text
                const optionsToCreate = [];
                for (let i = 0; i < 4; i++) {
                    const text = responses[i] ?? "";
                    const justification = justifs[i] ?? null;
                    const label = labelFromIndex(i);
                    let isCorrect = false;

                    if (correctRaw != null) {
                        const c = String(correctRaw).trim();
                        if (/^[ABCDabcd]$/.test(c)) {
                            if (c.toUpperCase() === label) isCorrect = true;
                        } else {
                            if (String(text).trim() && String(text).trim() === c) isCorrect = true;
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
                        externalQuestionId: String(externalQuestionId),
                        bloom: bloom as any,
                        stem: String(stem),
                        reference: reference ? String(reference) : null,
                        figureUrl: figure ? String(figure) : null,
                        ptBi,
                        average,
                        attemptsCount,
                        irtA: irtA ?? 0,
                        irtB: irtB ?? 0,
                        irtC: irtC ?? 0,
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
