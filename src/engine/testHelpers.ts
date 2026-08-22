import { createPRNG } from './prng'
import type { PRNGState } from './prng'

/** A fixed-seed PRNG state for use in tests. Deterministic and reproducible. */
export const TEST_PRNG: PRNGState = createPRNG(42)
