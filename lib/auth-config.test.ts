import { describe, it, expect, vi, afterEach } from 'vitest'

async function loadAuthConfig() {
  vi.resetModules()
  return (await import('./auth-config')).authConfig
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('authConfig.shibboleth', () => {
  it('uses relative SP paths when NEXT_PUBLIC_SHIBBOLETH_SP_URL is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SHIBBOLETH_SP_URL', '')
    const { shibboleth } = await loadAuthConfig()
    expect(shibboleth.loginUrl).toBe('/Shibboleth.sso/Login')
    expect(shibboleth.logoutUrl).toBe('/Shibboleth.sso/Logout')
  })

  it('prefixes SP paths with NEXT_PUBLIC_SHIBBOLETH_SP_URL when set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SHIBBOLETH_SP_URL', 'https://sp.studycat.local/')
    const { shibboleth } = await loadAuthConfig()
    expect(shibboleth.loginUrl).toBe('https://sp.studycat.local/Shibboleth.sso/Login')
    expect(shibboleth.logoutUrl).toBe('https://sp.studycat.local/Shibboleth.sso/Logout')
  })
})
