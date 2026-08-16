import { HeuristicAI } from './heuristicAI'
import { OptimusAI } from './optimusAI'
import { RandomAI } from './randomAI'
import type { AIStrategy } from './aiStrategy'
import type { AIDifficulty } from '../types/state'

export function createAI(difficulty: AIDifficulty): AIStrategy {
  if (difficulty === 'random') return RandomAI
  if (difficulty === 'optimus') return OptimusAI
  return HeuristicAI
}

export type { AIStrategy, AIDifficulty }
