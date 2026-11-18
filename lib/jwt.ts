// lib/jwt.ts
import { createHmac } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

// Cast this to any or the specific union type required by the library
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

/** Used only outside production, when JWT_SECRET is not set. */
const DEVELOPMENT_FALLBACK_SECRET = 'your-secret-key-change-in-production';

export const MIN_JWT_SECRET_LENGTH = 32;

/** Placeholder values from this repository's code and docs, which must never sign real sessions. */
const PLACEHOLDER_SECRETS = new Set([
  DEVELOPMENT_FALLBACK_SECRET,
  'change-me-to-a-long-random-string',
]);

/**
 * Returns why `secret` is unfit to sign production sessions, or null if it is acceptable.
 * Anyone who knows the secret can forge a session for any user, including admins.
 */
export function jwtSecretProblem(secret: string | undefined): string | null {
  if (!secret) return 'JWT_SECRET is not set';
  if (PLACEHOLDER_SECRETS.has(secret)) return 'JWT_SECRET is set to a placeholder value from the documentation';
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`;
  }
  return null;
}

/**
 * The secret that signs sessions (and keys derived from it). In production it must be set
 * to a strong value, or this throws; elsewhere an insecure fallback is used if it is unset.
 * Read on every call so the check cannot be skipped by importing this module early.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    const problem = jwtSecretProblem(secret);
    if (problem) {
      throw new Error(`${problem}. Generate one with: openssl rand -base64 48`);
    }
    return secret as string;
  }
  return secret || DEVELOPMENT_FALLBACK_SECRET;
}

export interface JWTPayload {
  userId: string;
  username: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  // Outside the try: a misconfigured secret must fail loudly, not look like an invalid session
  const secret = getJwtSecret();
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Derives a signing key for a purpose other than sessions. Anything signed with it fails
 * verifyToken, so other signed values can never be presented as a session token.
 */
export function deriveSigningKey(purpose: string): Buffer {
  return createHmac('sha256', getJwtSecret()).update(purpose).digest();
}
