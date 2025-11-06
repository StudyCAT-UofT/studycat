import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/data/question
 * 
 * Returns a .csv file containing headers questionId, stem, average, averageA, averageB, averageC, averageD, numAttempts
 * 
 * Query Parameters: 
 *  - quizID (required): The ID of the quiz to fetch questions
 * 
 * Returns:
 * - 200: A .csv file containing headers questionId, stem, average, averageA, averageB, averageC, averageD, numAttempts
 * - 400: Missing quizId
 * - 500: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const quizId = searchParams.get('quizId');

        // Determine item IDs to operate on
        let itemIds: string[] = [];

        const qi = await prisma.quizItem.findMany({
            where: { quizId: String(quizId) },
            select: { itemId: true },
        });
        itemIds = qi.map((r) => r.itemId);

        // If no items found, return header-only CSV
        const header = ["questionId", "stem", "average", "averageA", "averageB", "averageC", "averageD", "numAttempts"].join(",") + "\n";

        const grouped: Array<{ itemId: string; selectedLabel: string | null; isCorrect: boolean | null; _count: { _all: number } }> =
            (await (prisma as any).response.groupBy({
                by: ["itemId", "selectedLabel", "isCorrect"],
                where: { itemId: { in: itemIds } },
                _count: { _all: true },
            })) as any;

        // Fetch item metadata (externalQuestionId, stem)
        const itemsMeta = await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, externalQuestionId: true, stem: true },
        });

        // Build a map itemId -> aggregated stats
        type Agg = {
            numAttempts: number;
            correctCount: number;
            choiceCounts: { A: number; B: number; C: number; D: number };
        };

        const statsMap: Record<string, Agg> = {};
        for (const id of itemIds) {
            statsMap[id] = {
                numAttempts: 0,
                correctCount: 0,
                choiceCounts: { A: 0, B: 0, C: 0, D: 0 },
            };
        }

        for (const row of grouped) {
            const itemId = row.itemId;
            const label = row.selectedLabel as string | null;
            const isCorrect = !!row.isCorrect;
            const cnt = row._count ? row._count._all : 0;
            if (!statsMap[itemId]) {
                // initialize defensively
                statsMap[itemId] = {
                    numAttempts: 0,
                    correctCount: 0,
                    choiceCounts: { A: 0, B: 0, C: 0, D: 0 },
                };
            }
            statsMap[itemId].numAttempts += cnt;
            if (isCorrect) statsMap[itemId].correctCount += cnt;
            if (label && ["A", "B", "C", "D"].includes(label)) {
                statsMap[itemId].choiceCounts[label as "A" | "B" | "C" | "D"] += cnt;
            }
        }

        const csvEscape = (value: unknown) => {
            if (value === undefined || value === null) return "";
            const s = String(value);
            if (s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
            if (s.includes(",") || s.includes("\n") || s.includes("\r")) return `"${s}"`;
            return s;
        };

        // Build rows in same order as itemsMeta
        const rows: string[] = [];
        // create a mapping for itemsMeta by id for stable order
        const metaById = itemsMeta.reduce<Record<string, { externalQuestionId?: string | null; stem?: string | null }>>((acc, it) => {
            acc[it.id] = { externalQuestionId: it.externalQuestionId, stem: it.stem };
            return acc;
        }, {});

        for (const id of itemIds) {
            const meta = metaById[id] ?? {};
            const questionId = meta.externalQuestionId ?? id;
            const stem = meta.stem ?? "";

            const agg = statsMap[id] ?? { numAttempts: 0, correctCount: 0, choiceCounts: { A: 0, B: 0, C: 0, D: 0 } };
            const n = agg.numAttempts;

            const average = n > 0 ? (agg.correctCount / n) : 0;
            const averageA = n > 0 ? (agg.choiceCounts.A / n) : 0;
            const averageB = n > 0 ? (agg.choiceCounts.B / n) : 0;
            const averageC = n > 0 ? (agg.choiceCounts.C / n) : 0;
            const averageD = n > 0 ? (agg.choiceCounts.D / n) : 0;

            // format as decimal with 2 places
            const fmt = (v: number) => v.toFixed(2);

            rows.push(
                [
                    questionId,
                    csvEscape(stem),
                    fmt(average),
                    fmt(averageA),
                    fmt(averageB),
                    fmt(averageC),
                    fmt(averageD),
                    n,
                ].join(",")
            );
        }

        const csvContent = header + rows.join("\n");

        // Set headers for file download
        const filename = `questions_${quizId}.csv`;

        const headers = {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        };

        return new NextResponse(csvContent, { status: 200, headers });

    } catch (error) {
        // Log error for debugging while keeping client response generic
        console.error('Failed to fetch questions:', error)
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }
}