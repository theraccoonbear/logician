import type { HexId, PlayerId } from './ids'
import type { StructureType } from './structure'
import type { AssistanceLevel, GameState } from './state'

export type GameAction =
  | { type: 'BUILD_STRUCTURE'; playerId: PlayerId; hexId: HexId; structureType: StructureType; playHighPriestessCardId?: string }
  | { type: 'SKIP_BUILD'; playerId: PlayerId }
  | { type: 'CAST_SPELL'; playerId: PlayerId; logicCardId: string; effectCardId: string; tarotId: string }
  | { type: 'PLAY_MAJOR_ARCANA'; playerId: PlayerId; tarotId: string; params?: unknown }
  | { type: 'TAKE_HOLD_CARD'; playerId: PlayerId; tarotId: string }
  | { type: 'PLAY_HELD_ARCANA'; playerId: PlayerId; cardId: string; params?: unknown }
  | { type: 'PASS_TRIGGER_WINDOW'; playerId: PlayerId }
  | { type: 'END_TURN'; playerId: PlayerId }
  | { type: 'SET_ASSISTANCE_LEVEL'; playerId: PlayerId; assistanceLevel: AssistanceLevel }

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string }
