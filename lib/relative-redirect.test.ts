// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { relativeRedirect } from './relative-redirect'

describe('relativeRedirect', () => {
  it('returns a 307 with a relative Location header by default', () => {
    const res = relativeRedirect('/login?error=user_not_found')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/login?error=user_not_found')
  })

  it('accepts another redirect status', () => {
    expect(relativeRedirect('/', 303).status).toBe(303)
  })

  it.each(['login', 'https://evil.example/', '//evil.example/'])('rejects non-site-relative path %s', (path) => {
    expect(() => relativeRedirect(path)).toThrow()
  })
})
