import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/users
 * 
 * Fetches all users in the system, ordered by creation date (newest first).
 * This endpoint is typically used for administrative purposes.
 * 
 * Returns:
 * - 200: Array of all users
 * - 500: Server error
 */
export async function GET() {
  try {
    // Fetch all users ordered by creation date (most recent first)
    const users = await prisma.user.findMany({ 
      orderBy: { createdAt: 'desc' } 
    })
    return NextResponse.json({ users })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    logger.error({ err: error }, 'Failed to fetch users')
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

/**
 * POST /api/users
 * 
 * Creates a new user in the system.
 * Requires username; roles are now managed at the course offering level.
 * 
 * Request Body:
 * - username (required): User's unique username
 * 
 * Returns:
 * - 201: Created user object
 * - 400: Missing required fields
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    // Parse request body to extract user data
    const { username } = await request.json()
    
    // Validate required fields
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Create new user in database
    const user = await prisma.user.create({ 
      data: { 
        username
      } 
    })
    
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    logger.error({ err: error }, 'Failed to create user')
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
