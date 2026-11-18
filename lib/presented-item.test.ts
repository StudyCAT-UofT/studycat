// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isPresentedItem, signPresentedItem, verifyPresentedItem } from './presented-item'
import { signToken, verifyToken } from './jwt'

const claim = { attemptId: 'attempt-1', itemId: 'item-1', position: 3 }

describe('presented item tokens', () => {
  it('round-trips a signed claim', () => {
    expect(verifyPresentedItem(signPresentedItem(claim))).toEqual(claim)
  })

  it('matches only the exact attempt, item and position', () => {
    const token = signPresentedItem(claim)
    expect(isPresentedItem(token, claim)).toBe(true)
    expect(isPresentedItem(token, { ...claim, attemptId: 'attempt-2' })).toBe(false)
    expect(isPresentedItem(token, { ...claim, itemId: 'item-2' })).toBe(false)
    expect(isPresentedItem(token, { ...claim, position: 4 })).toBe(false)
  })

  it('rejects a token whose payload was edited', () => {
    const [, signature] = signPresentedItem(claim).split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ a: 'attempt-1', i: 'easy-item', p: 3 })).toString('base64url')
    expect(verifyPresentedItem(`${forgedPayload}.${signature}`)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    for (const token of [undefined, null, 42, '', 'abc', 'a.b', 'a.b.c', `${signPresentedItem(claim)}.extra`]) {
      expect(verifyPresentedItem(token)).toBeNull()
    }
  })

  it('cannot be used as a session token, and a session token cannot be used as one', () => {
    expect(verifyToken(signPresentedItem(claim))).toBeNull()
    expect(verifyPresentedItem(signToken({ userId: 'user-1', username: 'alice' }))).toBeNull()
  })
})
