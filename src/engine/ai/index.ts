import { HeuristicAI } from './heuristicAI'
import { RandomAI } from './randomAI'
import type { AIStrategy } from './aiStrategy'
import type { AIDifficulty } from '../types/state'

export function createAI(difficulty: AIDifficulty): AIStrategy {
  return difficulty === 'random' ? RandomAI : HeuristicAI
}

export type { AIStrategy, AIDifficulty }
