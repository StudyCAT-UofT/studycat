import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BloomCategory } from '@prisma/client'

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

/**
 * POST /api/items
 * 
 * Creates a new question item with its options.
 * 
 * Request Body:
 * - courseId: string (required)
 * - externalQuestionId: string (required)
 * - module: string (required)
 * - bloom: BloomCategory (required)
 * - stem: string (required)
 * - reference?: string
 * - figureUrl?: string
 * - options: Array<{
 *     label: OptionLabel
 *     text: string
 *     justification?: string
 *     isCorrect: boolean
 *   }> (required)
 * 
 * Returns:
 * - 201: Created item with options
 * - 400: Invalid request data
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    const {
      courseId,
      externalQuestionId,
      module,
      bloom,
      stem,
      reference,
      figureUrl,
      options
    } = body

    if (!courseId || !externalQuestionId || !module || !bloom || !stem || !options) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, externalQuestionId, module, bloom, stem, options' },
        { status: 400 }
      )
    }

    // Validate bloom category
    if (!Object.values(BloomCategory).includes(bloom)) {
      return NextResponse.json(
        { error: 'Invalid bloom category' },
        { status: 400 }
      )
    }

    // Validate options
    if (!Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { error: 'Options must be a non-empty array' },
        { status: 400 }
      )
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check for duplicate externalQuestionId within the same course
    const duplicateItem = await prisma.item.findFirst({
      where: {
        courseId,
        externalQuestionId
      }
    })

    if (duplicateItem) {
      return NextResponse.json(
        { error: 'A question with this ID already exists in this course' },
        { status: 400 }
      )
    }

    // Validate that at least one option is marked as correct
    const correctOptions = options.filter(opt => opt.isCorrect)
    if (correctOptions.length === 0) {
      return NextResponse.json(
        { error: 'At least one option must be marked as correct' },
        { status: 400 }
      )
    }

    // Validate option labels are unique
    const optionLabels = options.map(opt => opt.label)
    const uniqueLabels = new Set(optionLabels)
    if (optionLabels.length !== uniqueLabels.size) {
      return NextResponse.json(
        { error: 'Option labels must be unique' },
        { status: 400 }
      )
    }

    // Use a transaction to create the item and its options
    const newItem = await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.item.create({
        data: {
          courseId,
          externalQuestionId,
          module,
          bloom,
          stem,
          reference: reference || null,
          figureUrl: figureUrl || null,
          active: true,
          // Set default IRT parameters
          irtA: 1.0,
          irtB: 0.0,
          irtC: 0.25
        }
      })

      // Create options
      const newOptions = await Promise.all(
        options.map(option => 
          tx.itemOption.create({
            data: {
              itemId: item.id,
              label: option.label,
              text: option.text,
              justification: option.justification || null,
              isCorrect: option.isCorrect
            }
          })
        )
      )

      return { ...item, options: newOptions }
    })

    return NextResponse.json({ item: newItem }, { status: 201 })
  } catch (error) {
    console.error('Failed to create item:', error)
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/items
 * 
 * Deletes multiple question items and all their associated options.
 * 
 * Request Body:
 * - ids: Array of item IDs to delete (required)
 * 
 * Returns:
 * - 200: Success message with count of deleted items
 * - 400: Invalid request data
 * - 500: Server error
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    // Validate required fields
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate that all IDs are strings
    if (!ids.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All ids must be strings' },
        { status: 400 }
      )
    }

    // Use a transaction to delete all items and their options
    const result = await prisma.$transaction(async (tx) => {
      // First, delete all options for the items
      await tx.itemOption.deleteMany({
        where: { itemId: { in: ids } }
      })

      // Then delete the items
      const deletedItems = await tx.item.deleteMany({
        where: { id: { in: ids } }
      })

      return deletedItems
    })

    return NextResponse.json({ 
      message: `Successfully deleted ${result.count} item(s)` 
    })
  } catch (error) {
    console.error('Failed to delete items:', error)
    return NextResponse.json(
      { error: 'Failed to delete items' },
      { status: 500 }
    )
  }
}
