import { describe, expect, it } from 'vitest'

/**
 * Static audit: lists every file+line that uses Math.random() in the engine.
 * If this test fails, a new Math.random() usage was added that must either:
 *   1. Be replaced with the seeded PRNG (src/engine/prng.ts), or
 *   2. Be added to the ALLOWED list below with a justification.
 *
 * To update: run `npx vitest run prng.audit` and read the violation output,
 * then update the EXPECTED_VIOLATIONS set if the new usage is legitimate.
 */

// Files that are allowed to contain Math.random() (relative to src/engine/)
const EXPECTED_VIOLATIONS = new Map([
  // levelResolution.ts: injectable random fallback — callers must pass PRNG-backed random
  ['levelResolution.ts', [40]],
])

describe('Math.random() usage audit', () => {
  it('all Math.random() usages are in the allowed set', () => {
    // We scan source files at runtime via fetch (Vitest serves them) or fs
    // Since this runs under Vitest (Node), we use dynamic import of fs
    // but the test itself has no build-time Node dependency.
    const fs = require('fs') as typeof import('fs')
    const path = require('path') as typeof import('path')

    const engineDir = __dirname
    const violations: string[] = []

    function scanDir(dir: string) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) {
          scanDir(full)
        } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && entry !== 'prng.ts') {
          const content = fs.readFileSync(full, 'utf-8')
          const lines = content.split('\n')
          const relFile = path.relative(engineDir, full)
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (!line.includes('Math.random')) continue
            const trimmed = line.trim()
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue

            const allowed = EXPECTED_VIOLATIONS.get(relFile)
            if (allowed && allowed.includes(i + 1)) continue
            violations.push(`${relFile}:${i + 1}: ${trimmed}`)
          }
        }
      }
    }

    scanDir(engineDir)

    expect(
      violations,
      `New Math.random() usage found — must go through seeded PRNG:\n${violations.join('\n')}`,
    ).toHaveLength(0)
  })
})
