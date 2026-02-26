import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const ADMIN_COURSE_CODE = 'SYSTEM';
const ADMIN_TERM_NAME = 'ADMIN';

export interface UserSession {
  userId: string
  username: string
}

export const createToken = (user: UserSession): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token: string): UserSession | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession
  } catch {
    return null
  }
}

export const getSession = async (): Promise<UserSession | null> => {
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
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId,
      offeringRole: 'ADMIN',
      offering: {
        course: { code: ADMIN_COURSE_CODE },
        term: { name: ADMIN_TERM_NAME },
      },
    },
    select: { id: true },
  });

  return !!enrollment;
};

export const requireAdmin = async (userId: string) => {
  const admin = await isAdmin(userId);
  if (!admin) {
    throw new Error('Unauthorized: Admin access required');
  }
};
