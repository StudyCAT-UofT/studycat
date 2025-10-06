import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/items
 * 
 * Fetches all active question items for a specific course.
 * Returns questions with their options, ordered by module and question ID.
 * 
 * Query Parameters:
 * - courseId (required): The ID of the course to fetch items for
 * 
 * Returns:
 * - 200: Array of question items with options
 * - 400: Missing course ID
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // Validate required parameter
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Fetch all active question items for the specified course
    const items = await prisma.item.findMany({
      where: {
        courseId,
        active: true // Only fetch active questions
      },
      include: {
        // Include all answer options for each question
        options: {
          orderBy: { label: 'asc' } // Sort options alphabetically by label
        }
      },
      orderBy: [
        { module: 'asc' },           // Group by module first
        { externalQuestionId: 'asc' } // Then by question ID within each module
      ]
    })

    return NextResponse.json({ items })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    console.error('Failed to fetch items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}
