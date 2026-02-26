import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/users
 * 
 * Fetches all users in the database. 
 * 
 * Returns:
 * - 200: Array of quizzes with statistics
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET() {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        try {
            await requireAdmin(session.userId)
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const users = await prisma.user.findMany({
            orderBy: { username: 'asc' }
        })

        return NextResponse.json({ users }, { status: 200 })
    } catch (error) {
        console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

/**
 * POST /api/admin/users
 * 
 * Creates a new user.
 * 
 * Body:
 * - username (required): The uTorID of the user.
 * - givenName: The user's given name.
 * - familyName: The user's family name.
 * 
 * Returns:
 * - 201: Created user
 * - 401: Unauthorized
 * - 403: Forbidden (non-admin user)
 * - 500: Server error
 */
export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        try {
            await requireAdmin(session.userId)
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()

        const user = await prisma.user.create({
            data: {
            username: body.username,
            givenName: body.givenName ?? '',
            familyName: body.familyName ?? '',
            }
        })

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error('Failed to create user:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}