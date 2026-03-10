import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/status
 * 
 * Returns whether the currently authenticated user is an admin.
 * 
 * Responses:
 * - 200: { admin: boolean }
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET() {
    try {
        // Get current session
        const session = await getSession()
        if (!session) return NextResponse.json({ admin: false }, { status: 401 })

        // Check admin status safely
        let isAdmin = false
        try {
            await requireAdmin(session.userId)
            isAdmin = true
        } catch {
            isAdmin = false
        }

        return NextResponse.json({ admin: isAdmin }, { status: 200 })
    } catch (error) {
        console.error('Failed to get admin status:', error)
        return NextResponse.json({ admin: false }, { status: 500 })
    }
}
