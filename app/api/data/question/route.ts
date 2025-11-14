import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { OptionLabel, PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * GET /api/data/question
 * 
 * Returns JSON containing question-level stats for items in a quiz.
 * 
 * Query Parameters: 
 *  - quizID (required): The ID of the quiz to fetch questions
 * 
 * Returns:
 * - 200: JSON containing quizId, count (num items in the quiz), and items 
 *        (object containing item id, stem, average (how often student got correct answer), 
 *        averageA (percentage of time a student chose option A), averageB, averageC, averageD, 
 *        and numAttempts)
 * - 400: Missing quizId
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

        // Determine item IDs to operate on
        let itemIds: string[] = [];

        const quiz = await prisma.quiz.findUnique({
            where: { id: String(quizId) },
            select: { includedModuleIds: true },
        });

        if (!quiz) {
            throw new Error('Quiz not found');
        }

        const quizItems = await prisma.item.findMany({
            where: {
                moduleId: { in: quiz.includedModuleIds },
                active: true, // optional: filter to only active items
            },
            select: { id: true },
        });

        itemIds = quizItems.map((item) => item.id);

        // If empty, return empty items array
        if (itemIds.length === 0) {
            return NextResponse.json({ quizId, count: 0, items: [] }, { status: 200 })
        }

        const optionLabels = Object.values(OptionLabel) as OptionLabel[];

        const grouped = await (prisma as PrismaClient).response.groupBy({
            by: ['itemId', 'selectedLabel', 'isCorrect'],
            where: { itemId: { in: itemIds } },
            _count: { _all: true },
        });

        // Fetch item metadata (externalQuestionId, stem)
        const itemsMeta = await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, externalQuestionId: true, stem: true },
        });

        type ChoiceCounts = Record<OptionLabel, number>
        // Build a map itemId -> aggregated stats
        type Agg = {
            numAttempts: number;
            correctCount: number;
            choiceCounts: ChoiceCounts;
        };

        const initChoiceCounts = (): Record<OptionLabel, number> => {
            const counts = {} as ChoiceCounts;
            for (const label of optionLabels) counts[label] = 0;
            return counts;
        };

        const statsMap: Record<string, Agg> = {};
        for (const id of itemIds) {
            statsMap[id] = {
                numAttempts: 0,
                correctCount: 0,
                choiceCounts: initChoiceCounts(),
            };
        }

        for (const row of grouped) {
            const itemId = row.itemId;
            const rawLabel = row.selectedLabel;
            const label = (rawLabel as OptionLabel) ?? null;
            const isCorrect = !!row.isCorrect;
            const cnt = row._count ? row._count._all : 0;
            if (!statsMap[itemId]) {
                // initialize defensively
                statsMap[itemId] = {
                    numAttempts: 0,
                    correctCount: 0,
                    choiceCounts: initChoiceCounts(),
                };
            }
            statsMap[itemId].numAttempts += cnt;
            if (isCorrect) statsMap[itemId].correctCount += cnt;
            if (label && optionLabels.includes(label)) {
                statsMap[itemId].choiceCounts[label] += cnt;
            }
        }

        // Map meta by id for stable order
        const metaById = itemsMeta.reduce<Record<string, { externalQuestionId?: string | null; stem?: string | null }>>(
            (acc, it) => {
                acc[it.id] = { externalQuestionId: it.externalQuestionId, stem: it.stem }
                return acc
            },
            {}
        );

        // Build items array
        const items = itemIds.map((id) => {
            const meta = metaById[id] ?? {}
            const questionId = meta.externalQuestionId ?? id
            const stem = meta.stem ?? ''

            const agg = statsMap[id] ?? { numAttempts: 0, correctCount: 0, choiceCounts: initChoiceCounts() }
            const n = agg.numAttempts

            const base = {
                questionId,
                stem,
                average: n > 0 ? agg.correctCount / n : 0,
                numAttempts: n,
            } as Record<string, unknown>;

            // dynamic average fields per OptionLabel (e.g., averageA, averageB, ...)
            for (const label of optionLabels) {
                const key = `average${label}`;
                base[key] = n > 0 ? agg.choiceCounts[label] / n : 0;
            }

            return base;
        });

        return NextResponse.json({ quizId, count: items.length, items }, { status: 200 });

    } catch (error) {
        // Log error for debugging while keeping client response generic
        console.error('Failed to fetch questions:', error)
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }
}