import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

function findTsFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...findTsFiles(full))
    } else if (entry.endsWith('.ts')) {
      results.push(full)
    }
  }
  return results
}

/**
 * Scans all engine source files (excluding tests, this file, and prng.ts itself)
 * for uses of Math.random(). Every source of randomness in the game engine must
 * go through the seeded PRNG (src/engine/prng.ts) to ensure determinism.
 *
 * Known exceptions:
 *   - prng.ts: generateSeed() uses crypto.getRandomValues (true entropy for seeding only)
 *   - levelResolution.ts: `options.random ?? Math.random` fallback is acceptable because
 *     callers are expected to pass a PRNG-backed random; the fallback is a safety net.
 */
describe('Math.random() usage audit', () => {
  it('no engine source file uses Math.random() directly (except prng.ts and levelResolution fallback)', () => {
    const engineDir = join(__dirname)
    const files = findTsFiles(engineDir)
      .filter((f) => !f.includes('.test.ts'))
      .filter((f) => !f.endsWith('/prng.ts'))

    const allowedPatterns = [
      // levelResolution.ts: injectable random fallback — callers must pass PRNG-backed random
      /options\.random \?\? Math\.random/,
    ]

    const violations: string[] = []

    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes('Math.random')) {
          // Skip comment-only lines (// or * or /*)
          const trimmed = line.trim()
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue

          const isAllowed = allowedPatterns.some((p) => p.test(line))
          if (!isAllowed) {
            const rel = relative(engineDir, file)
            violations.push(`${rel}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      `Found forbidden Math.random() usage:\n${violations.join('\n')}\n\nAll randomness must go through the seeded PRNG (src/engine/prng.ts).`,
    ).toHaveLength(0)
  })
})
