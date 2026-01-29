import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * PUT /api/quizzes/[id]
 * 
 * Updates an existing quiz.
 * 
 * Body:
 * - title (optional): The quiz title
 * - includedModuleIds (optional): Array of module IDs to include
 * - active (optional): Whether the quiz is active
 * - fixedLength (optional): Number of questions in the quiz
 * 
 * Returns:
 * - 200: Updated quiz
 * - 404: Quiz not found
 * - 400: Invalid data
 * - 500: Server error
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, includedModuleIds, active, fixedLength } = body

    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: { 
        offering: true,
        quizModules: true
       }
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Validate includedModuleIds if provided
    let validModuleIds: string[] | undefined
    if (includedModuleIds && Array.isArray(includedModuleIds) && includedModuleIds.length > 0) {
      const modules = await prisma.module.findMany({
        where: {
          id: { in: includedModuleIds },
          offeringId: existingQuiz.offeringId
        }
      })

      if (modules.length !== includedModuleIds.length) {
        return NextResponse.json({ error: 'One or more modules not found or do not belong to this course offering' }, { status: 400 })
      }

      validModuleIds = modules.map(m => m.id)
    }

    // Validate fixedLength if provided
    if (fixedLength !== undefined && fixedLength < 1) {
      return NextResponse.json({ error: 'Fixed length must be at least 1' }, { status: 400 })
    }

    // Update the quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(active !== undefined && { active }),
        ...(fixedLength !== undefined && { fixedLength }),
        ...(validModuleIds !== undefined && {
          quizModules: {
            // Remove modules that are no longer included
            deleteMany: {
              moduleId: { notIn: validModuleIds }
            },
            // Add new modules (skip duplicates)
            create: validModuleIds
              .filter(
                moduleId => !existingQuiz.quizModules.some(qm => qm.moduleId === moduleId)
              )
              .map(moduleId => ({ moduleId }))
          }
        })
      }
    })

    return NextResponse.json({ quiz: updatedQuiz })
  } catch (error) {
    console.error('Failed to update quiz:', error)
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 })
  }
}

/**
 * DELETE /api/quizzes/[id]
 * 
 * Deletes a quiz.
 * 
 * Returns:
 * - 200: Success
 * - 404: Quiz not found
 * - 500: Server error
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Check if quiz exists
    const existingQuiz = await prisma.quiz.findUnique({
      where: { id }
    })

    if (!existingQuiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Delete the quiz
    await prisma.quiz.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete quiz:', error)
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 })
  }
}
