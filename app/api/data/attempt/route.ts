import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/data/attempt
 * 
 * Returns a .csv file containing headers userID, score, questionSequence
 * 
 * Query Parameters: 
 *  - quizID (required): The ID of the quiz to fetch attempts from
 * 
 * Returns:
 * - 200: A .csv file containing headers userID, score, questionSequence
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const quizId = searchParams.get('quizId');

        // Validate required parameter
        if (!quizId) {
            return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
        }

        const attempts = await prisma.attempt.findMany({
            where: {
                quizId,
                status: "COMPLETED", // AttemptStatus.COMPLETED
            },
            include: {
                enrollment: {
                    select: { userId: true, id: true },
                },
                responses: {
                    include: {
                        item: {
                            select: { externalQuestionId: true, id: true },
                        },
                    },
                    orderBy: { askedAt: "asc" },
                },
            },
            orderBy: { startedAt: "asc" },
        });

        // Build rows
        const rows: string[] = [];

        for (const at of attempts) {
            // if no responses, score = 0
            const total = at.responses.length;
            const correctCount = at.responses.reduce((acc, r) => acc + (r.isCorrect ? 1 : 0), 0);
            // Calculate percentage; guard divide by zero
            const scorePct = total > 0 ? (correctCount / total) * 100 : 0;
            // Format to two decimals
            const scoreFormatted = scorePct.toFixed(2);

            // Build questionSequence — use externalQuestionId where available; fallback to itemId
            const seq = at.responses
                .map((r) => r.item?.externalQuestionId ?? r.itemId ?? "")
                // filter empty entries
                .filter((x) => x !== "")
                // join with pipe to avoid colliding with CSV commas
                .join("|");

            const studentId = at.enrollment?.userId ?? "";

            rows.push([studentId, scoreFormatted, seq].join(","));
        }

        const header = ["userId", "score", "questionSequence"].join(",") + "\n";
        const csvContent = header + rows.join("\n");

        // Set headers for file download
        const filename = `attempts_${quizId}.csv`;

        const headers = {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        };

        return new NextResponse(csvContent, { status: 200, headers });
    } catch (error) {
        // Log error for debugging while keeping client response generic
        console.error('Failed to fetch modules:', error)
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }
}