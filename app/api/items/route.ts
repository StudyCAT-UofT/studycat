import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BloomCategory, bloomCategories } from '@/types'

export const runtime = 'nodejs'

/**
 * GET /api/items
 *
 * Fetches question items for a specific course.
 * Returns questions with their options, ordered by module and question ID.
 *
 * Query Parameters:
 * - courseId (required): The ID of the course to fetch items for
 * - includeInactive (optional): "true" to include inactive questions
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
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Validate required parameter
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Fetch question items for the specified course
    const items = await prisma.item.findMany({
      where: {
        courseId,
        ...(includeInactive ? {} : { active: true }) // Only filter by active unless includeInactive is true
      },
      include: {
        // Include all answer options for each question
        options: {
          orderBy: { label: 'asc' } // Sort options alphabetically by label
        },
        // Include module information
        module: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { module: { name: 'asc' } }, // Group by module name first
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
 * - moduleId: string (required)
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
      moduleId,
      bloom,
      stem,
      reference,
      figureUrl,
      options
    } = body

    if (!courseId || !externalQuestionId || !moduleId || !bloom || !stem || !options) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, externalQuestionId, moduleId, bloom, stem, options' },
        { status: 400 }
      )
    }

    // Validate bloom category
    if (!bloomCategories.includes(bloom as BloomCategory)) {
      return NextResponse.json(
        { error: 'Invalid bloom category' },
        { status: 400 }
      );
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

    // Check if module exists and belongs to a course offering for this course
    const existingModule = await prisma.module.findFirst({
      where: { 
        id: moduleId,
        offering: {
          courseId: courseId
        }
      }
    })

    if (!existingModule) {
      return NextResponse.json(
        { error: 'Module not found or does not belong to this course' },
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

    // Validate option text content is unique (no duplicate answer options)
    const optionTexts = options.map(opt => opt.text.trim())
    const uniqueTexts = new Set(optionTexts)
    if (optionTexts.length !== uniqueTexts.size) {
      return NextResponse.json(
        { error: 'Answer options must be unique - no duplicate text content allowed' },
        { status: 400 }
      )
    }

    const irtC = options.filter(opt => opt.isCorrect).length / options.length
    // Use a transaction to create the item and its options
    const newItem = await prisma.$transaction(async (tx) => {
      // Create the item
      const item = await tx.item.create({
        data: {
          courseId,
          moduleId,
          externalQuestionId,
          bloom,
          stem,
          reference: reference || null,
          figureUrl: figureUrl || null,
          active: true,
          // Set default IRT parameters
          irtA: 1.0,
          irtB: 0.0,
          irtC
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
 * PATCH /api/items
 *
 * Bulk update the active status of multiple question items.
 *
 * Request Body:
 * - ids: Array of item IDs to update (required)
 * - active: boolean (required)
 *
 * Returns:
 * - 200: Success message with count of updated items
 * - 400: Invalid request data
 * - 500: Server error
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { ids, active } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'active must be a boolean' },
        { status: 400 }
      )
    }

    if (!ids.every((id: unknown) => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All ids must be strings' },
        { status: 400 }
      )
    }

    const result = await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { active }
    })

    return NextResponse.json({
      message: `Successfully ${active ? 'activated' : 'deactivated'} ${result.count} item(s)`,
      count: result.count
    })
  } catch (error) {
    console.error('Failed to update items:', error)
    return NextResponse.json(
      { error: 'Failed to update items' },
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

    // Delete the items (options will be automatically deleted due to onDelete: Cascade)
    const result = await prisma.item.deleteMany({
      where: { id: { in: ids } }
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
