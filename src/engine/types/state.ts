import type { Hex } from '../board'
import type { EffectCard, EffectCardId, LogicCard } from './cards'
import type { HexId, PlayerId } from './ids'
import type { PRNGState } from '../prng'
import type { Structure } from './structure'
import type { MajorArcanaCard, MajorArcanaId, MinorArcanaCard, Operand, TarotCard } from './tarot'

// 'setup': each player is still placing their initial Pool+Pyramid+Tower trio.
export type Phase = 'setup' | 'build' | 'cast' | 'awaitingTrigger' | 'awaitingMajorChoice'

export type AIDifficulty = 'random' | 'heuristic' | 'optimus'
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

/** Tracks an in-progress multi-player Major Arcana interaction where opponents must supply choices. */
export interface PendingMajorChoice {
  casterId: PlayerId
  majorId: MajorArcanaId
  tarot: MajorArcanaCard
  /** Caster's own parameter values (e.g. casterValue for forced-operand, logicCardId for Devil). */
  casterParams: Record<string, unknown>
  /** Opponent responses collected so far, keyed by player id. */
  opponentParams: Record<string, unknown>
  /** For Devil: tracks which condition index (0 or 1) the current responder is filling. */
  devilConditionIndex?: number
}

export type PendingResolution =
  | {
      kind: 'spell'
      casterId: PlayerId
      logicCardInstanceId: string
      logicCardKind: string
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
  /** In-progress multi-player Major Arcana interaction: awaiting opponent input. */
  pendingMajorChoice?: PendingMajorChoice
  /** Remaining players (in response order) who still need to submit an opponent choice. */
  majorChoiceQueue?: PlayerId[]
  log: GameEvent[]
  winner?: PlayerId
  /** Seeded PRNG state for deterministic random events. */
  prng: PRNGState
}

export type { HexId, PlayerId }
