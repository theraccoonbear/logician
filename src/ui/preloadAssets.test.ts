import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock Image in the Node test environment
class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  _src = ''
  set src(v: string) {
    this._src = v
    // Simulate async load (never synchronous — avoids cache-related timing issues in tests)
    setTimeout(() => this.onload?.(), 0)
  }
  get src() { return this._src }
}
// @ts-expect-error test mock
globalThis.Image = MockImage

// Reset the module-level cache between tests
vi.resetModules()

describe('preloadAssets', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('resolves with total === 121', async () => {
    const { preloadAssets } = await import('./preloadAssets')
    const { promise } = preloadAssets()
    const result = await promise
    expect(result.total).toBe(121)
    expect(result.loaded).toBe(result.total)
  })

  it('subscribe immediately emits current progress', async () => {
    const { preloadAssets } = await import('./preloadAssets')
    const { subscribe } = preloadAssets()
    const calls: { loaded: number; total: number }[] = []
    const unsub = subscribe((p) => calls.push({ ...p }))
    // First call should have emitted current state immediately
    expect(calls.length).toBe(1)
    expect(calls[0].total).toBe(121)
    unsub()
  })

  it('subscribe receives updates as images load', async () => {
    const { preloadAssets } = await import('./preloadAssets')
    const { subscribe, promise } = preloadAssets()
    const calls: { loaded: number; total: number }[] = []
    const unsub = subscribe((p) => calls.push({ ...p }))
    await promise
    // Should have received multiple progress updates
    expect(calls.length).toBeGreaterThan(1)
    // Last update should show all loaded
    const last = calls[calls.length - 1]
    expect(last.loaded).toBe(last.total)
    expect(last.total).toBe(121)
    unsub()
  })

  it('returns the same promise on repeated calls', async () => {
    const { preloadAssets } = await import('./preloadAssets')
    const r1 = preloadAssets()
    const r2 = preloadAssets()
    expect(r1.promise).toBe(r2.promise)
    await r1.promise
  })
})
