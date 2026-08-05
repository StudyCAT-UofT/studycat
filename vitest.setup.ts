import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './mocks/server'

// ─── MSW server lifecycle ─────────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ─── Cleanup after each test ──────────────────────────────────────────────────
afterEach(() => {
  cleanup()
})

// ─── Browser API stubs (needed for Mantine and other UI libs in jsdom) ────────
// Guarded because some test files opt into the `node` environment (e.g. API
// route tests that need Node's native File/FormData/Request instead of jsdom's).
if (typeof window !== 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // jsdom 30 throws instead of falling back when resolving a `calc()` value
  // (e.g. font-size) that references a CSS custom property with no defined
  // value — which is every `var(--mantine-*)` reference here, since we don't
  // load Mantine's stylesheet in tests. This is hit by @floating-ui's
  // overflow-ancestor detection (used by Mantine's Popover/Menu/Tooltip),
  // not by any application code, so fall back to a blank element's computed
  // style rather than letting it surface as an unhandled rejection.
  const originalGetComputedStyle = window.getComputedStyle.bind(window)
  window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
    try {
      return originalGetComputedStyle(elt, pseudoElt)
    } catch {
      return originalGetComputedStyle(document.createElement('div'), pseudoElt)
    }
  }
}
