import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/modules
 * 
 * Fetches all modules for a specific course offering.
 * 
 * Query Parameters:
 * - courseOfferingId (required): The ID of the course offering to fetch modules for
 * 
 * Returns:
 * - 200: Array of modules
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseOfferingId = searchParams.get('courseOfferingId')

    // Validate required parameter
    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    // Fetch all modules for the specified course offering
    const modules = await prisma.module.findMany({
      where: {
        offeringId: courseOfferingId
      },
      select: {
        id: true,
        name: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ modules })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    logger.error({ err: error }, 'Failed to fetch modules')
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }
}
