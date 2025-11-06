import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/data/theta
 * 
 * Returns a .csv file containing headers userID, module, theta
 * 
 * Query Parameters: 
 *  - courseOfferingID (required): The ID of the course offering to fetch theta values for
 * 
 * Returns:
 * - 200: A .csv file containing headers userID, module, theta
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

        // build CSV file 
        const csvHeader = ["studentID", "module", "theta"].join(",") + "\n";

        const rows = thetas.map((t) => {
            const studentId = t.enrollment && t.enrollment.userId ? t.enrollment.userId : "";
            const moduleName = t.module ? t.module.name : "";
            const thetaVal = t.value;
            return [studentId, moduleName, thetaVal].join(",");
        });

        // create the CSV
        const csvContent = csvHeader + rows.join("\n");

        // Set headers for file download
        const filename = `thetas_${courseOfferingId}.csv`;

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