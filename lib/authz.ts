import { NextResponse } from 'next/server'
import { getSession, type UserSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Server-side authorization helpers for API routes.
 *
 * Every helper returns either `{ ok: true, ... }` or `{ ok: false, response }`, where
 * `response` is a ready-to-return 401/403 NextResponse:
 *
 *   const auth = await requireOfferingRole(offeringId, STAFF_ROLES)
 *   if (!auth.ok) return auth.response
 *
 * Admins (User.isAdmin) pass every role check.
 */

export type OfferingRole = 'STUDENT' | 'TA' | 'INSTRUCTOR'

/** Roles allowed to manage an offering (question bank, quizzes, roster, analytics). */
export const STAFF_ROLES: readonly OfferingRole[] = ['INSTRUCTOR', 'TA']

/** Any enrolled user. */
export const ANY_ROLE: readonly OfferingRole[] = ['STUDENT', 'TA', 'INSTRUCTOR']

type Denied = { ok: false; response: NextResponse }
type SessionResult = { ok: true; session: UserSession } | Denied
type RoleResult = { ok: true; session: UserSession; isAdmin: boolean } | Denied

export const unauthorizedResponse = () =>
  NextResponse.json({ error: 'Authentication required' }, { status: 401 })

export const forbiddenResponse = () =>
  NextResponse.json({ error: 'Forbidden' }, { status: 403 })

const deny = (response: NextResponse): Denied => ({ ok: false, response })

const userIsAdmin = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } })
  return user?.isAdmin ?? false
}

/** Requires a valid session cookie. */
export async function requireSession(): Promise<SessionResult> {
  const session = await getSession()
  if (!session) return deny(unauthorizedResponse())
  return { ok: true, session }
}

/** Requires a valid session belonging to an admin. */
export async function requireAdminUser(): Promise<RoleResult> {
  const auth = await requireSession()
  if (!auth.ok) return auth
  if (!(await userIsAdmin(auth.session.userId))) return deny(forbiddenResponse())
  return { ok: true, session: auth.session, isAdmin: true }
}

/**
 * Requires the user to hold one of `roles` in EVERY listed offering, and (for course
 * scopes) in at least one offering of EVERY listed course. An empty scope is only
 * satisfied by admins, so a caller can never authorize "nothing" by accident.
 */
export async function requireRole(
  scope: { offeringIds?: string[]; courseIds?: string[] },
  roles: readonly OfferingRole[],
): Promise<RoleResult> {
  const auth = await requireSession()
  if (!auth.ok) return auth
  const { userId } = auth.session

  const offeringIds = [...new Set(scope.offeringIds ?? [])]
  const courseIds = [...new Set(scope.courseIds ?? [])]

  let allowed = offeringIds.length + courseIds.length > 0

  if (allowed && offeringIds.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, offeringId: { in: offeringIds }, offeringRole: { in: [...roles] } },
      select: { offeringId: true },
    })
    const covered = new Set(enrollments.map((e) => e.offeringId))
    allowed = offeringIds.every((id) => covered.has(id))
  }

  if (allowed && courseIds.length > 0) {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, offeringRole: { in: [...roles] }, offering: { courseId: { in: courseIds } } },
      select: { offering: { select: { courseId: true } } },
    })
    const covered = new Set(enrollments.map((e) => e.offering.courseId))
    allowed = courseIds.every((id) => covered.has(id))
  }

  if (allowed) return { ok: true, session: auth.session, isAdmin: false }
  if (await userIsAdmin(userId)) return { ok: true, session: auth.session, isAdmin: true }
  return deny(forbiddenResponse())
}

export const requireOfferingRole = (offeringId: string, roles: readonly OfferingRole[]) =>
  requireRole({ offeringIds: [offeringId] }, roles)

export const requireCourseRole = (courseId: string, roles: readonly OfferingRole[]) =>
  requireRole({ courseIds: [courseId] }, roles)
