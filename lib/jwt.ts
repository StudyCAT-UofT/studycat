// lib/jwt.ts
import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';

export const DEFAULT_SESSION_LIFETIME_SECONDS = 24 * 60 * 60;

/** Why a SESSION_LIFETIME_SECONDS value is unusable, or null if it is fine (unset means the default). */
export function sessionLifetimeProblem(value: string | undefined): string | null {
  if (value === undefined || value === '') return null;
  if (!/^[1-9]\d*$/.test(value)) {
    return `SESSION_LIFETIME_SECONDS must be a positive whole number of seconds, not "${value}"`;
  }
  return null;
}

/**
 * How long a session lasts after signing in, for both the token and its cookie. Set by
 * SESSION_LIFETIME_SECONDS, default 24 hours. Read on each call, like getJwtSecret(); an
 * invalid value throws rather than silently falling back.
 */
export function getSessionLifetimeSeconds(): number {
  const value = process.env.SESSION_LIFETIME_SECONDS;
  const problem = sessionLifetimeProblem(value);
  if (problem) throw new Error(problem);
  return value ? Number(value) : DEFAULT_SESSION_LIFETIME_SECONDS;
}

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
    expiresIn: getSessionLifetimeSeconds(),
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
