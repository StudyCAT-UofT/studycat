import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
