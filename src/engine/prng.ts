/**
 * Mulberry32 seeded PRNG for deterministic game state.
 * 
 * Usage:
 *   const prng = createPRNG(seed)
 *   const { value, prng: nextPrng } = nextRandom(prng)
 *   // nextPrng is the advanced state, use it for subsequent calls
 */

export interface PRNGState {
  /** Internal state of the mulberry32 PRNG. Starts as the seed. */
  seed: number
}

/**
 * Creates a new PRNG state from a seed.
 * The seed should be a 32-bit integer (use generateSeed() for random seeds).
 */
export function createPRNG(seed: number): PRNGState {
  return { seed: seed | 0 }
}

/**
 * Returns a random number in [0, 1) and the advanced PRNG state.
 * Uses mulberry32 algorithm - fast, deterministic, and good distribution.
 */
export function nextRandom(prng: PRNGState): { value: number; prng: PRNGState } {
  let state = prng.seed | 0
  state = (state + 0x6D2B79F5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, prng: { seed: state } }
}

/**
 * Generates a cryptographically random seed.
 * Uses crypto.getRandomValues for browser compatibility.
 */
export function generateSeed(): number {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0]
}