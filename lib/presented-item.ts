import { createHmac, timingSafeEqual } from 'crypto'
import { deriveSigningKey } from '@/lib/jwt'

/**
 * Proof that the server presented a particular item at a particular point in an attempt.
 *
 * The engine is stateless and the database does not record which item is on screen, so
 * without this a student could answer any item they like (an easy one, or one whose answer
 * they already know) and the engine would update their ability from it. Instead, init and
 * step return a signed token with every item they present, and step only accepts an answer
 * that carries the token for that item at the attempt's current position.
 *
 * `position` is the number of responses the attempt had when the item was presented. A token
 * therefore stops working once any answer has been recorded, which also rejects resubmitting
 * the same answer twice.
 */
export type PresentedItem = {
  attemptId: string
  itemId: string
  position: number
}

const key = () => deriveSigningKey('studycat:presented-item:v1')

const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest()

export function signPresentedItem(item: PresentedItem): string {
  const payload = Buffer.from(
    JSON.stringify({ a: item.attemptId, i: item.itemId, p: item.position }),
  ).toString('base64url')
  return `${payload}.${sign(payload).toString('base64url')}`
}

/** Returns the signed claim, or null if the token is malformed or was not signed by us. */
export function verifyPresentedItem(token: unknown): PresentedItem | null {
  if (typeof token !== 'string') return null
  const [payload, signature, ...rest] = token.split('.')
  if (!payload || !signature || rest.length > 0) return null

  const expected = sign(payload)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const { a, i, p } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof a !== 'string' || typeof i !== 'string' || !Number.isInteger(p)) return null
    return { attemptId: a, itemId: i, position: p }
  } catch {
    return null
  }
}

/** True if `token` proves `itemId` is the item presented at `position` in `attemptId`. */
export function isPresentedItem(
  token: unknown,
  expected: PresentedItem,
): boolean {
  const claim = verifyPresentedItem(token)
  return (
    claim !== null &&
    claim.attemptId === expected.attemptId &&
    claim.itemId === expected.itemId &&
    claim.position === expected.position
  )
}
