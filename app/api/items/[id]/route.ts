import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BloomCategory, bloomCategories } from '@/types'

export const runtime = 'nodejs'

/**
 * DELETE /api/items/[id]
 * 
 * Deletes a question item and all its associated options.
 * 
 * Path Parameters:
 * - id: The ID of the item to delete
 * 
 * Returns:
 * - 200: Success message
 * - 404: Item not found
 * - 500: Server error
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Delete the item (options will be automatically deleted due to onDelete: Cascade)
    await prisma.item.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Failed to delete item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/items/[id]
 * 
 * Updates an existing question item and its options.
 * 
 * Path Parameters:
 * - id: The ID of the item to update
 * 
 * Request Body:
 * - externalQuestionId: string
 * - moduleId: string
 * - bloom: BloomCategory
 * - stem: string
 * - reference?: string
 * - figureUrl?: string
 * - options: Array<{
 *     id: string
 *     label: OptionLabel
 *     text: string
 *     justification?: string
 *     isCorrect: boolean
 *   }>
 * 
 * Returns:
 * - 200: Updated item with options
 * - 400: Invalid request data
 * - 404: Item not found
 * - 500: Server error
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate required fields
    const {
      externalQuestionId,
      moduleId,
      bloom,
      stem,
      reference,
      figureUrl,
      options
    } = body

    if (!externalQuestionId || !moduleId || !bloom || !stem || !options) {
      return NextResponse.json(
        { error: 'Missing required fields: externalQuestionId, moduleId, bloom, stem, options' },
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

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
      include: { options: true }
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Check if module exists and belongs to a course offering for this course
    const existingModule = await prisma.module.findFirst({
      where: { 
        id: moduleId,
        offering: {
          courseId: existingItem.courseId
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
        id: { not: id },
        courseId: existingItem.courseId,
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
    // Use a transaction to update the item and its options
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Update the item
      const item = await tx.item.update({
        where: { id },
        data: {
          externalQuestionId,
          moduleId,
          bloom,
          stem,
          reference: reference || null,
          figureUrl: figureUrl || null,
          irtC
        }
      })

      // Delete existing options (needed for update - onDelete: Cascade only applies when parent is deleted)
      await tx.itemOption.deleteMany({
        where: { itemId: id }
      })

      // Create new options
      const newOptions = await Promise.all(
        options.map(option => 
          tx.itemOption.create({
            data: {
              itemId: id,
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

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    console.error('Failed to update item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}
