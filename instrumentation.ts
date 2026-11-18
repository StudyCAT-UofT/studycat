/**
 * Next.js calls register() once when a server instance starts (not during `next build`).
 * Startup checks live in instrumentation-node.ts, which is only loaded in the Node.js
 * runtime because it uses Node-only APIs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}
