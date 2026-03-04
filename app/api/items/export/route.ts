import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as xlsx from "xlsx";

export const runtime = "nodejs";

/**
 * GET /api/items/export?courseId=<id>&format=xlsx|csv
 *
 * Exports all active questions for a course as an .xlsx or .csv file.
 * The column format matches the Quizzical/upload format for roundtrip compatibility.
 *
 * Column order:
 * index, lecture, question_id, category, submission_date, attempts, average,
 * biserial, rating, author_name, question, question_figure, answer_figure,
 * answer_a, answer_justification_a, answer_b, answer_justification_b, ...,
 * correct_answer, irt_a, irt_b, irt_c, reference
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get("courseId");
        const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";

        if (!courseId) {
            return NextResponse.json(
                { error: "courseId is required" },
                { status: 400 }
            );
        }

        const items = await prisma.item.findMany({
            where: { courseId, active: true },
            include: {
                options: { orderBy: { label: "asc" } },
                module: { select: { name: true } },
            },
            orderBy: [
                { module: { name: "asc" } },
                { externalQuestionId: "asc" },
            ],
        });

        // Determine max number of options across all items
        const maxOptions = items.reduce(
            (max, item) => Math.max(max, item.options.length),
            4 // minimum 4 columns (A-D) even if fewer options exist
        );

        // Build header array matching the expected Quizzical export format
        const headers: string[] = [
            "index",
            "lecture",
            "question_id",
            "category",
            "submission_date",
            "attempts",
            "average",
            "biserial",
            "rating",
            "author_name",
            "question",
            "question_figure",
            "answer_figure",
        ];
        // Interleave answer and justification columns: answer_a, answer_justification_a, answer_b, ...
        for (let i = 0; i < maxOptions; i++) {
            const letter = String.fromCharCode(97 + i);
            headers.push(`answer_${letter}`);
            headers.push(`answer_justification_${letter}`);
        }
        headers.push("correct_answer", "irt_a", "irt_b", "irt_c", "reference");

        // Build rows
        const rows: Record<string, unknown>[] = items.map((item, idx) => {
            const row: Record<string, unknown> = {};

            row["index"] = idx + 1;
            row["lecture"] = item.module.name;
            row["question_id"] = item.externalQuestionId;
            row["category"] = item.bloom;
            row["submission_date"] = item.createdAt
                ? new Date(item.createdAt).toISOString().split("T")[0]
                : null;
            row["attempts"] = item.attemptsCount ?? null;
            row["average"] = item.average ?? null;
            row["biserial"] = item.ptBi ?? null;
            row["rating"] = null; // not stored in DB
            row["author_name"] = null; // not stored in DB
            row["question"] = item.stem;
            row["question_figure"] = item.figureUrl ?? null;
            row["answer_figure"] = null; // not yet stored — see GitHub issue #68

            // Interleaved answer options and justifications
            for (let i = 0; i < maxOptions; i++) {
                const letter = String.fromCharCode(97 + i);
                const option = item.options.find(
                    (o) => o.label === String.fromCharCode(65 + i)
                );
                row[`answer_${letter}`] = option?.text ?? null;
                row[`answer_justification_${letter}`] =
                    option?.justification ?? null;
            }

            // Determine correct answer letter(s)
            const correctLabels = item.options
                .filter((o) => o.isCorrect)
                .map((o) => o.label);
            row["correct_answer"] =
                correctLabels.length === 1
                    ? correctLabels[0]
                    : correctLabels.join(",");

            row["irt_a"] = item.irtA;
            row["irt_b"] = item.irtB;
            row["irt_c"] = item.irtC;
            row["reference"] = item.reference ?? null;

            return row;
        });

        const ws = xlsx.utils.json_to_sheet(rows, { header: headers });

        if (format === "csv") {
            const csvString = xlsx.utils.sheet_to_csv(ws);
            return new Response(csvString, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="questions-export.csv"`,
                },
            });
        }

        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Questions");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        return new Response(buffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="questions-export.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Failed to export items:", error);
        return NextResponse.json(
            { error: "Failed to export items" },
            { status: 500 }
        );
    }
}
