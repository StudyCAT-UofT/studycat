// lib/jwt.ts
import { createHmac } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Cast this to any or the specific union type required by the library
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface JWTPayload {
  userId: string;
  username: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Derives a signing key for a purpose other than sessions. Anything signed with it fails
 * verifyToken, so other signed values can never be presented as a session token.
 */
export function deriveSigningKey(purpose: string): Buffer {
  return createHmac('sha256', JWT_SECRET).update(purpose).digest();
}
