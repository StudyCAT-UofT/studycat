// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { getJwtSecret, getSessionLifetimeSeconds, jwtSecretProblem, signToken, verifyToken, deriveSigningKey } from './jwt'

const STRONG = 'k3Jq9vX2mP7rT4wZ8yB1nC6dF0gH5jL2sA9eQ3uV'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('jwtSecretProblem', () => {
  it.each([
    ['unset', undefined, /not set/],
    ['empty', '', /not set/],
    ['the code fallback', 'your-secret-key-change-in-production', /placeholder/],
    ['the .env.example placeholder', 'change-me-to-a-long-random-string', /placeholder/],
    ['shorter than 32 characters', 'a'.repeat(31), /at least 32 characters/],
  ])('rejects a secret that is %s', (_name, secret, message) => {
    expect(jwtSecretProblem(secret)).toMatch(message)
  })

  it('accepts a long random secret', () => {
    expect(jwtSecretProblem(STRONG)).toBeNull()
  })
})

describe('getJwtSecret in production', () => {
  it.each([undefined, '', 'change-me-to-a-long-random-string', 'short'])('throws for %j', (secret) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', secret as string)
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/)
  })

  it('returns a strong secret', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', STRONG)
    expect(getJwtSecret()).toBe(STRONG)
  })

  it('makes signing, verifying and key derivation fail loudly rather than fall back', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('JWT_SECRET', '')
    const token = signToken({ userId: 'u1', username: 'alice' })

    vi.stubEnv('NODE_ENV', 'production')
    expect(() => signToken({ userId: 'u1', username: 'alice' })).toThrow(/JWT_SECRET/)
    // Not a silent null: a misconfigured server must not look like "every session expired"
    expect(() => verifyToken(token)).toThrow(/JWT_SECRET/)
    expect(() => deriveSigningKey('purpose')).toThrow(/JWT_SECRET/)
  })
})

describe('getJwtSecret outside production', () => {
  it('falls back to a development secret when unset', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('JWT_SECRET', '')
    expect(getJwtSecret()).toBe('your-secret-key-change-in-production')
  })

  it('uses JWT_SECRET when set, even a weak one', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('JWT_SECRET', 'change-me-to-a-long-random-string')
    expect(getJwtSecret()).toBe('change-me-to-a-long-random-string')
  })
})

describe('session tokens', () => {
  it('only verify with the secret that signed them', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', STRONG)
    const token = signToken({ userId: 'u1', username: 'alice' })
    expect(verifyToken(token)).toMatchObject({ userId: 'u1', username: 'alice' })

    vi.stubEnv('JWT_SECRET', STRONG.split('').reverse().join(''))
    expect(verifyToken(token)).toBeNull()
  })
})

describe('session lifetime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const lifetimeOf = (token: string) => {
    const { iat, exp } = jwt.decode(token) as { iat: number; exp: number }
    return exp - iat
  }

  it('signs session tokens that expire 24 hours after sign-in by default', () => {
    vi.stubEnv('SESSION_LIFETIME_SECONDS', undefined)
    expect(getSessionLifetimeSeconds()).toBe(24 * 60 * 60)
    expect(lifetimeOf(signToken({ userId: 'u1', username: 'alice' }))).toBe(24 * 60 * 60)
  })

  it('uses SESSION_LIFETIME_SECONDS when set', () => {
    vi.stubEnv('SESSION_LIFETIME_SECONDS', '3600')
    expect(getSessionLifetimeSeconds()).toBe(3600)
    expect(lifetimeOf(signToken({ userId: 'u1', username: 'alice' }))).toBe(3600)
  })

  it.each(['24h', '0', '-60', '1.5', ' 3600', 'abc'])('refuses to sign with SESSION_LIFETIME_SECONDS=%j', (value) => {
    vi.stubEnv('SESSION_LIFETIME_SECONDS', value)
    expect(() => getSessionLifetimeSeconds()).toThrow(/SESSION_LIFETIME_SECONDS must be a positive whole number/)
    expect(() => signToken({ userId: 'u1', username: 'alice' })).toThrow(/SESSION_LIFETIME_SECONDS/)
  })

  it('accepts a token until it is 24 hours old, then rejects it', () => {
    vi.stubEnv('SESSION_LIFETIME_SECONDS', undefined)
    vi.useFakeTimers({ now: new Date('2026-11-18T09:00:00Z') })
    const token = signToken({ userId: 'u1', username: 'alice' })

    vi.setSystemTime(new Date('2026-11-19T08:59:59Z'))
    expect(verifyToken(token)).toMatchObject({ userId: 'u1' })

    vi.setSystemTime(new Date('2026-11-19T09:00:01Z'))
    expect(verifyToken(token)).toBeNull()
  })
})
