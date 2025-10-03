import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    const items = await prisma.item.findMany({
      where: {
        courseId,
        active: true
      },
      include: {
        options: {
          orderBy: { label: 'asc' }
        }
      },
      orderBy: [
        { module: 'asc' },
        { externalQuestionId: 'asc' }
      ]
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error('Failed to fetch items:', e)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}
