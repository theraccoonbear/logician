import type { Hex } from '../board'
import type { EffectCard, EffectCardId, LogicCard } from './cards'
import type { HexId, PlayerId } from './ids'
import type { Structure } from './structure'
import type { MajorArcanaCard, MajorArcanaId, MinorArcanaCard, Operand, TarotCard } from './tarot'

// 'setup': each player is still placing their initial Pool+Pyramid+Tower trio.
export type Phase = 'setup' | 'build' | 'cast' | 'awaitingTrigger'

export type AIDifficulty = 'random' | 'heuristic'
export type AssistanceLevel = 'none' | 'some' | 'full'

export interface Player {
  id: PlayerId
  name: string
  isAI: boolean
  /** Ignored for human seats. Defaults to 'heuristic' when isAI and unset. */
  aiDifficulty?: AIDifficulty
  /** Ignored for AI seats. Defaults to 'none' when human and unset. */
  assistanceLevel?: AssistanceLevel
  logicHand: LogicCard[]
  effectHand: EffectCard[]
  heldMajorArcana: MajorArcanaCard[]
}

export interface HierophantOverride {
  structureId: string
  newLevel: number
}

export type PendingResolution =
  | {
      kind: 'spell'
      casterId: PlayerId
      logicCardInstanceId: string
      effectCardInstanceId: string
      /** Denormalized from the Effect card instance at declare time, so Hierophant eligibility doesn't need a hand lookup. */
      effectCardKind: EffectCardId
      tarot: MinorArcanaCard
      operandA: Operand
      operandB: Operand
      cancelled?: boolean
      hierophantOverride?: HierophantOverride
    }
  | {
      kind: 'majorAction'
      casterId: PlayerId
      majorId: MajorArcanaId
      tarot: MajorArcanaCard
      params: unknown
      cancelled?: boolean
      hierophantOverride?: HierophantOverride
    }

export interface GameEvent {
  message: string
}

export interface GameState {
  players: Player[]
  activePlayerIndex: number
  phase: Phase
  board: Hex[]
  structures: Structure[]
  tarotRow: TarotCard[]
  tarotDeck: TarotCard[]
  tarotDiscard: TarotCard[]
  logicDeck: LogicCard[]
  logicDiscard: LogicCard[]
  effectDeck: EffectCard[]
  effectDiscard: EffectCard[]
  pendingTrigger?: PendingResolution
  /** Remaining players (in response order) who still get a chance to react during 'awaitingTrigger'. */
  triggerQueue?: PlayerId[]
  log: GameEvent[]
  winner?: PlayerId
}

export type { HexId, PlayerId }
