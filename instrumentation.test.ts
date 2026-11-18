// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const STRONG = 'k3Jq9vX2mP7rT4wZ8yB1nC6dF0gH5jL2sA9eQ3uV'

/** Runs the server startup hook as Next.js would, in the Node.js runtime. */
const startServer = async () => {
  vi.resetModules()
  const { register } = await import('./instrumentation')
  await register()
}

describe('server startup', () => {
  let exit: ReturnType<typeof vi.spyOn>
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each([
    ['is not set', ''],
    ['is the .env.example placeholder', 'change-me-to-a-long-random-string'],
    ['is too short', 'short'],
  ])('exits in production when JWT_SECRET %s', async (_name, secret) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', secret)

    await startServer()

    expect(exit).toHaveBeenCalledWith(1)
    expect(consoleError).toHaveBeenCalledWith(expect.stringMatching(/^Refusing to start: JWT_SECRET/))
  })

  it('starts in production with a strong JWT_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', STRONG)
    await startServer()
    expect(exit).not.toHaveBeenCalled()
  })

  it('starts in development without a JWT_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('JWT_SECRET', '')
    await startServer()
    expect(exit).not.toHaveBeenCalled()
  })

  it('does not run the Node.js checks in the Edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', '')
    await startServer()
    expect(exit).not.toHaveBeenCalled()
  })
})
