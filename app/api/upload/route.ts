// app/api/import-items/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

type SuccessResp = { success: true; importedCount: number; errors: string[]; previewRows?: any[]; message?: string };
type ErrResp = { success: false; error: string; errors?: string[] };

const BLOOM_VALUES = [
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
    "EVALUATE",
    "CREATE",
] as const;
type BloomValue = (typeof BLOOM_VALUES)[number];

function normalizeBloom(raw?: string | null): BloomValue | null {
    if (!raw) return null;
    const v = String(raw).trim().toLowerCase();
    if (v.startsWith("remember") || v === "r" || v === "recall") return "REMEMBER";
    if (v.startsWith("understand") || v === "u") return "UNDERSTAND";
    if (v.startsWith("application") || v === "a") return "APPLY";
    if (v.startsWith("analy") || v === "an") return "ANALYZE";
    if (v.startsWith("evalu") || v === "e") return "EVALUATE";
    if (v.startsWith("create") || v === "c" || v === "synthesize") return "CREATE";
    for (const val of BLOOM_VALUES) if (val.toLowerCase() === v) return val as BloomValue;
    return null;
}

/** More aggressive bold detection for SheetJS cell objects */
function cellIsBold(cell: XLSX.CellObject | undefined, workbook?: XLSX.WorkBook): boolean {
    if (!cell) return false;

    // 1) Direct style object on cell (most straightforward)
    try {
        // @ts-ignore
        const s = (cell as any).s;
        if (s && s.font) {
            const b = s.font.bold;
            if (b === true || b === "1" || b === 1) return true;
            // sometimes weight is provided
            const weight = s.font?.weight ?? s.font?.fontWeight ?? s.font?.w;
            if (typeof weight === "string" && (weight === "bold" || parseInt(weight, 10) >= 700)) return true;
            if (typeof weight === "number" && weight >= 700) return true;
        }
    } catch { }

    // 2) Rich-text runs (various export formats)
    try {
        // @ts-ignore
        const runs = (cell as any).r || (cell as any).richText || (cell as any).rich_text || (cell as any).richRuns;
        if (Array.isArray(runs)) {
            for (const r of runs) {
                if (!r) continue;
                // run may have rPr.b or bold property
                if (r.rPr && (r.rPr.b === true || r.rPr.b === "1" || r.rPr.b === 1)) return true;
                if (r.bold === true || r.bold === "1" || r.bold === 1) return true;
                // sometimes style specified as font object
                if (r.font && (r.font.bold === true || r.font.bold === "1")) return true;
                // HTML fragments sometimes stored as strings in run
                if (typeof r === "string" && /<b>.*<\/b>/i.test(r)) return true;
            }
        }
    } catch { }

    // 3) Some implementations place rich text in .v or .w with <b> tags (rare, but check)
    try {
        if (typeof (cell as any).v === "string" && /<b>.*<\/b>/i.test((cell as any).v)) return true;
        if (typeof (cell as any).w === "string" && /<b>.*<\/b>/i.test((cell as any).w)) return true;
    } catch { }

    // 4) Check `cell.s` if it is an index into workbook styles (SheetJS sometimes stores index)
    try {
        // @ts-ignore
        const si = (cell as any).s;
        if (typeof si === "number" && workbook && (workbook as any).Styles) {
            // workbook.Styles is not a stable API; inspect if available
            const styles = (workbook as any).Styles;
            if (styles && styles.cellXfs && styles.fonts) {
                const xf = styles.cellXfs[si];
                if (xf && xf.fontId != null) {
                    const font = styles.fonts[xf.fontId];
                    if (font && (font.b === true || font.bold === true || font.bold === "1")) return true;
                }
            }
        }
    } catch { }

    // 5) As a last-ditch: if the string is visually uppercase or surrounded by markers someone uses to indicate bold,
    // this is heuristics only — do not rely on it by itself.
    try {
        const text = (cell as any).v ?? (cell as any).w;
        if (typeof text === "string" && text.trim().length > 0) {
            // If they used **bold** or B: prefix in the cell text (some workflows)
            if (/^\*\*.*\*\*$/.test(text.trim()) || /^\*\w+/.test(text) || /^\[b\].*\[\/b\]/i.test(text)) return true;
        }
    } catch { }

    return false;
}


export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const fileField = formData.get("file");
        const courseIdField = formData.get("courseId");
        const dryRunField = formData.get("dryRun");

        if (!fileField || !(fileField instanceof File)) {
            return NextResponse.json({ success: false, error: "Missing file field" } as ErrResp, { status: 400 });
        }
        if (!courseIdField || typeof courseIdField !== "string") {
            return NextResponse.json({ success: false, error: "Missing courseId field" } as ErrResp, { status: 400 });
        }

        const courseId = String(courseIdField);
        const dryRun = String(dryRunField ?? "1") === "1";

        // read workbook from uploaded file
        const arrayBuffer = await fileField.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            return NextResponse.json({ success: false, error: "No sheet found in workbook" } as ErrResp, { status: 400 });
        }

        // decode header -> column letter mapping using range (so we can inspect cell objects for styles)
        const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
        const headerRowIndex = range.s.r;
        const colToHeader: Record<string, string> = {};
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddr = XLSX.utils.encode_cell({ c: C, r: headerRowIndex });
            const cell = sheet[cellAddr];
            const header = cell ? String(XLSX.utils.format_cell(cell)).trim() : "";
            colToHeader[XLSX.utils.encode_col(C)] = header || "";
        }

        // convert whole sheet to array rows for simpler value extraction
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
        const previewRows: any[] = [];

        const importedRows: { externalQuestionId: string; itemData: any; options: any[] }[] = [];
        const errors: string[] = [];

        for (let r = 1; r < rows.length; r++) {
            const row = rows[r] as any[];
            // build map header -> value and header -> cell obj (for style inspection)
            const rowMap: Record<string, any> = {};
            const cellMap: Record<string, XLSX.CellObject | undefined> = {};

            for (let C = range.s.c; C <= range.e.c; ++C) {
                const colLetter = XLSX.utils.encode_col(C);
                const header = colToHeader[colLetter];
                const cellAddr = XLSX.utils.encode_cell({ c: C, r });
                const cell = sheet[cellAddr];
                const value = row[C] ?? "";
                if (header) rowMap[header] = value;
                cellMap[header] = cell;
            }

            const externalQuestionId = String(rowMap["Question_ID"] ?? rowMap["QuestionID"] ?? "").trim();
            if (!externalQuestionId) {
                errors.push(`Row ${r + 1}: missing Question_ID`);
                continue;
            }

            const bloomRaw = rowMap["Bloom_Cat"] ?? rowMap["Bloom"] ?? null;
            const normalizedBloom = normalizeBloom(bloomRaw) ?? null;

            const itemData = {
                externalQuestionId,
                module: String(rowMap["Module"] ?? "").trim() || "Uncategorized",
                bloom: normalizedBloom,
                stem: String(rowMap["Stem"] ?? "").trim(),
                reference: String(rowMap["Reference"] ?? "").trim() || null,
                figureUrl: String(rowMap["Figure"] ?? "").trim() || null,
                ptBi: (() => { const n = Number(rowMap["PtBi"]); return Number.isFinite(n) ? n : null })(),
                average: (() => { const n = Number(rowMap["Average"]); return Number.isFinite(n) ? n : null })(),
                attemptsCount: (() => { const n = parseInt(String(rowMap["Attempts"] ?? ""), 10); return Number.isFinite(n) ? n : null })(),
                irtA: (() => { const n = Number(rowMap["IRT_a"]); return Number.isFinite(n) ? n : 0 })(),
                irtB: (() => { const n = Number(rowMap["IRT_b"]); return Number.isFinite(n) ? n : 0 })(),
                irtC: (() => { const n = Number(rowMap["IRT_c"]); return Number.isFinite(n) ? n : 0 })(),
            };

            // collect response options
            const options: { label: string; text: string; justification?: string | null; isCorrect: boolean; header: string }[] = [];
            for (const header of Object.values(colToHeader)) {
                if (!header) continue;
                const m = header.match(/^Response[_\s]?([A-Z])$/i);
                if (m) {
                    const label = m[1].toUpperCase();
                    const respText = String(rowMap[header] ?? "").trim();
                    const justHeader = `Justification_${label}`;
                    const justification = (rowMap[justHeader] ?? "") || null;
                    const cellObj = cellMap[header];
                    const isBold = cellIsBold(cellObj);
                    options.push({ label, text: respText, justification, isCorrect: isBold, header });
                }
            }

            // If no Response_* columns detected, skip
            if (options.length === 0) {
                errors.push(`Row ${r + 1} (Question ${externalQuestionId}): no Response_* columns found`);
                continue;
            }

            // Fallback: if no bold flagged, look for explicit Correct/Answer column
            let anyBold = null
            const correctRaw = String(rowMap["Correct"] ?? rowMap["Answer"] ?? "").trim().toUpperCase();
            if (correctRaw) {
                for (const o of options) if (o.label === correctRaw) o.isCorrect = true;
                anyBold = options.some(o => o.isCorrect);
            }


            // minimal preview object for UI
            previewRows.push({
                Question_ID: externalQuestionId,
                Stem: itemData.stem,
                Module: itemData.module,
                Bloom: itemData.bloom,
                Options: options.map((o) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect })),
            });

            importedRows.push({ externalQuestionId, itemData, options });
        }

        // If dryRun -> return preview and errors
        if (dryRun) {
            return NextResponse.json({
                success: true,
                importedCount: importedRows.length,
                previewRows,
                errors,
                message: "Dry run preview",
            } as SuccessResp, { status: 200 });
        }

        // REAL DB IMPORT
        const createdItems: any[] = [];
        for (const row of importedRows) {
            const { externalQuestionId, itemData, options } = row;

            // Try find existing by compound unique index
            const existing = await prisma.item.findUnique({
                where: { courseId_externalQuestionId: { courseId, externalQuestionId } },
                include: { options: true },
            });

            if (existing) {
                // update item fields
                const updated = await prisma.item.update({
                    where: { id: existing.id },
                    data: {
                        module: itemData.module,
                        bloom: itemData.bloom as any,
                        stem: itemData.stem,
                        reference: itemData.reference,
                        figureUrl: itemData.figureUrl,
                        ptBi: itemData.ptBi,
                        average: itemData.average,
                        attemptsCount: itemData.attemptsCount,
                        irtA: itemData.irtA,
                        irtB: itemData.irtB,
                        irtC: itemData.irtC,
                    },
                });

                // Upsert each option by unique (itemId, label)
                for (const opt of options) {
                    await prisma.itemOption.upsert({
                        where: { itemId_label: { itemId: existing.id, label: opt.label as any } },
                        create: {
                            itemId: existing.id,
                            label: opt.label as any,
                            text: opt.text,
                            justification: opt.justification,
                            isCorrect: !!opt.isCorrect,
                        },
                        update: {
                            text: opt.text,
                            justification: opt.justification,
                            isCorrect: !!opt.isCorrect,
                        },
                    });
                }

                createdItems.push(updated);
            } else {
                // create new item + nested options
                const created = await prisma.item.create({
                    data: {
                        courseId,
                        externalQuestionId,
                        module: itemData.module,
                        bloom: itemData.bloom as any,
                        stem: itemData.stem,
                        reference: itemData.reference,
                        figureUrl: itemData.figureUrl,
                        ptBi: itemData.ptBi,
                        average: itemData.average,
                        attemptsCount: itemData.attemptsCount,
                        irtA: itemData.irtA ?? 0,
                        irtB: itemData.irtB ?? 0,
                        irtC: itemData.irtC ?? 0,
                        options: {
                            create: options.map((o) => ({
                                label: o.label as any,
                                text: o.text,
                                justification: o.justification,
                                isCorrect: !!o.isCorrect,
                            })),
                        },
                    },
                });
                createdItems.push(created);
            }
        }

        return NextResponse.json({
            success: true,
            importedCount: createdItems.length,
            errors,
            message: `Imported ${createdItems.length} items`,
        } as SuccessResp, { status: 201 });
    } catch (err: any) {
        console.error("POST error:", err);
        return NextResponse.json({ success: false, error: String(err?.message ?? err) } as ErrResp, { status: 500 });
    }
}
