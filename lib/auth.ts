import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { verifyToken, signToken, JWTPayload, getSessionLifetimeSeconds } from './jwt'

// Re-export JWTPayload as UserSession for backwards compatibility
export type UserSession = JWTPayload

export const createToken = (user: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return signToken(user)
}

/**
 * The signed-in user, or null. A token that is valid and unexpired still fails once its
 * user has been deleted, so removing an account ends its sessions immediately.
 */
export const getSession = async (): Promise<JWTPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } })
  return user ? payload : null
}

export const setSessionCookie = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set('session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: getSessionLifetimeSeconds(),
    path: '/'
  })
}

export const clearSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete('session-token')
}

export const isAdmin = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId
    }
  })
  if (!user) {
    return false;
  } else {
    return user.isAdmin;
  }
};

export const requireAdmin = async (userId: string) => {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error('Unauthorized: Admin access required');
  }
};
