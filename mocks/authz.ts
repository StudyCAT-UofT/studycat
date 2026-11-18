/**
 * Allow-all stand-in for '@/lib/authz', for route tests that exercise business logic
 * rather than access control (which is covered by lib/authz.test.ts and
 * app/api/authorization.test.ts). Usage:
 *
 *   vi.mock('@/lib/authz', () => import('@/mocks/authz'))
 */
import { vi } from 'vitest'
import { NextResponse } from 'next/server'

export const TEST_SESSION = { userId: 'user-1', username: 'testuser' }

const allowed = async () => ({ ok: true as const, session: TEST_SESSION, isAdmin: false })

export const STAFF_ROLES = ['INSTRUCTOR', 'TA'] as const
export const ANY_ROLE = ['STUDENT', 'TA', 'INSTRUCTOR'] as const

export const requireSession = vi.fn(allowed)
export const requireAdminUser = vi.fn(allowed)
export const requireRole = vi.fn(allowed)
export const requireOfferingRole = vi.fn(allowed)
export const requireCourseRole = vi.fn(allowed)

export const unauthorizedResponse = () =>
  NextResponse.json({ error: 'Authentication required' }, { status: 401 })
export const forbiddenResponse = () =>
  NextResponse.json({ error: 'Forbidden' }, { status: 403 })
