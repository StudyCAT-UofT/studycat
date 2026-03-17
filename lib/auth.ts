import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { verifyToken as verifyJWT, signToken, JWTPayload } from './jwt'

// Re-export JWTPayload as UserSession for backwards compatibility
export type UserSession = JWTPayload

export const createToken = (user: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return signToken(user)
}

export const verifyToken = (token: string): JWTPayload | null => {
  return verifyJWT(token)
}

export const getSession = async (): Promise<JWTPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get('session-token')?.value
  
  if (!token) return null
  
  return verifyToken(token)
}

export const setSessionCookie = async (token: string) => {
  const cookieStore = await cookies()
  cookieStore.set('session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
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
