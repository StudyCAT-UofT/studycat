import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/data/theta
 * 
 * Returns JSON containing average theta values per module, and individual student Theta values.
 * 
 * Query Parameters: 
 *  - courseOfferingID (required): The ID of the course offering to fetch theta values for
 * 
 * Returns:
 * - 200: JSON containing courseOfferingId, studentCount (num of students), 
 *        avgTheta (list of modules with their average Theta values), and students 
 *        (a list of objects containing studentId and thetas per module)
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const courseOfferingId = searchParams.get('courseOfferingId');

        // Validate required parameter
        if (!courseOfferingId) {
            return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 });
        }

        const thetas = await prisma.theta.findMany({
            where: {
                module: { offeringId: courseOfferingId },
            },
            include: {
                module: true,
                enrollment: {
                    include: { user: true },
                },
            },
        });

        // Group by studentId
        const grouped: Record<string, { module: string | null; theta: number | null }[]> = {};

        // Also aggregate per-module sums and counts for avgThetaList
        const moduleAgg: Record<string, { moduleName: string | null; sum: number; n: number }> = {};

        for (const t of thetas) {
            const studentId = t.enrollment?.userId ?? t.enrollmentId;
            if (!studentId) continue;

            const moduleName = t.module?.name ?? null;
            const thetaVal = typeof t.value === 'number' ? t.value : (t.value ? Number(t.value) : null);

            // group per-student
            if (!grouped[studentId]) grouped[studentId] = [];
            grouped[studentId].push({ module: moduleName, theta: thetaVal });

            // aggregate per-module
            const moduleId = t.module?.id ?? '__unknown__';
            if (!moduleAgg[moduleId]) {
                moduleAgg[moduleId] = { moduleName, sum: 0, n: 0 };
            }
            if (thetaVal !== null && !Number.isNaN(thetaVal)) {
                moduleAgg[moduleId].sum += thetaVal;
                moduleAgg[moduleId].n += 1;
            }
        }

        // Build students array
        const students = Object.entries(grouped).map(([studentId, thetasArr]) => ({
            studentId,
            thetas: thetasArr,
        }));

        // Build avgThetaList array
        const avgThetaList = Object.entries(moduleAgg).map(([moduleId, agg]) => ({
            moduleId: moduleId === '__unknown__' ? null : moduleId,
            moduleName: agg.moduleName,
            avgTheta: agg.n > 0 ? agg.sum / agg.n : null,
            sampleCount: agg.n,
        }));

        return NextResponse.json(
            {
                courseOfferingId,
                studentCount: students.length,
                avgThetaList,
                students,
            },
            { status: 200 }
        );

    } catch (error) {
        // Log error for debugging while keeping client response generic
        console.error('Failed to fetch modules:', error)
        return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
    }
}