import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { applyAction } from '../engine/reducer'
import { createInitialGameState, type PlayerConfig } from '../engine/setup'
import { computeVP } from '../engine/selectors'
import type { GameAction } from '../engine/types/actions'
import type { GameState } from '../engine/types/state'
import type { LogicCardId, EffectCardId } from '../engine/types/cards'
import type { Operand } from '../engine/types/tarot'
import { LOGIC_CARD_LABELS, EFFECT_CARD_LABELS } from './cardLabels'
import { tarotArtUrl } from './tarotArt'
import { clearSavedGame, loadSavedGame, saveGame } from './persistence'
import { capture } from './telemetry'

export interface StructureDelta {
  structureId: string
  hexId: string
  owner: string
  structureType: string
  terrain: string
  oldLevel: number
  newLevel: number | null
  delta: number
}

export interface SpellAnimationData {
  casterId: string
  logicCard: { kind: LogicCardId; label: string } | null
  effectCard: { kind: EffectCardId; label: string } | null
  tarotCard: { label: string; artUrl: string; operandA: Operand | null; operandB: Operand | null } | null
  structureDeltas: StructureDelta[]
  playerDeltas: Record<string, number>
}

export interface GameContextValue {
  state: GameState | null
  lastError: string | null
  startGame: (players: PlayerConfig[], opts?: { showRules?: boolean }) => void
  dispatch: (action: GameAction) => void
  newGame: () => void
  // One-shot signal for "a new game was just started with the rules-on-start preference
  // checked" — not part of GameState (which gets persisted/serialized), just a UI cue that
  // GameView consumes once to auto-open the help modal, then clears.
  pendingRulesOnStart: boolean
  clearPendingRulesOnStart: () => void
  spellAnimation: SpellAnimationData | null
  clearSpellAnimation: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState | null>(() => loadSavedGame())
  const [lastError, setLastError] = useState<string | null>(null)
  const [pendingRulesOnStart, setPendingRulesOnStart] = useState(false)
  const [spellAnimation, setSpellAnimation] = useState<SpellAnimationData | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state) saveGame(state)
  }, [state])

  const startGame = (players: PlayerConfig[], opts?: { showRules?: boolean }) => {
    const gameState = createInitialGameState(players)
    setState(gameState)
    setLastError(null)
    setPendingRulesOnStart(Boolean(opts?.showRules))
    setSpellAnimation(null)
    capture('game_started', {
      player_count: players.length,
      ai_players: players.filter((p) => p.isAI).length,
      ai_difficulty: players.find((p) => p.isAI)?.aiDifficulty,
      assistance_level: players.find((p) => !p.isAI)?.assistanceLevel,
    })
  }

  const clearSpellAnimation = useCallback(() => setSpellAnimation(null), [])

  const dispatch = (action: GameAction) => {
    const preState = stateRef.current
    if (!preState) return
    const result = applyAction(preState, action)
    if (result.ok) {
      setState(result.state)
      setLastError(null)

      if (action.type === 'BUILD_STRUCTURE') {
        const hex = preState.board.find((h) => h.id === action.hexId)
        capture('structure_built', {
          structure_type: action.structureType,
          terrain: hex?.terrain,
          player_id: action.playerId,
          phase: preState.phase,
        })
      } else if (action.type === 'SKIP_BUILD') {
        capture('build_skipped', { player_id: action.playerId })
      } else if (action.type === 'CAST_SPELL') {
        const caster = preState.players.find((p) => p.id === action.playerId)
        const lc = caster?.logicHand.find((c) => c.instanceId === action.logicCardId)
        const ec = caster?.effectHand.find((c) => c.instanceId === action.effectCardId)
        const tc = preState.tarotRow.find((t) => t.instanceId === action.tarotId)
        capture('spell_cast', {
          logic_card: lc ? LOGIC_CARD_LABELS[lc.kind] : undefined,
          effect_card: ec ? EFFECT_CARD_LABELS[ec.kind] : undefined,
          tarot_suit: tc?.kind === 'minor' ? tc.suit : undefined,
          tarot_rank: tc?.kind === 'minor' ? tc.rank : undefined,
          player_id: action.playerId,
        })
      } else if (action.type === 'PLAY_MAJOR_ARCANA') {
        capture('major_arcana_played', {
          card_id: action.tarotId,
          player_id: action.playerId,
        })
      } else if (action.type === 'TAKE_HOLD_CARD') {
        capture('hold_card_taken', {
          card_id: action.tarotId,
          player_id: action.playerId,
        })
      } else if (action.type === 'PLAY_HELD_ARCANA') {
        capture('held_arcana_played', {
          card_id: action.cardId,
          player_id: action.playerId,
        })
      }

      if (result.state.winner) {
        const scores = Object.fromEntries(
          result.state.players.map((p) => [p.id, computeVP(result.state, p.id)]),
        )
        capture('game_ended', {
          winner_id: result.state.winner,
          scores,
          player_count: result.state.players.length,
        })
      }

      if (action.type === 'CAST_SPELL' || action.type === 'PLAY_MAJOR_ARCANA') {
        const caster = preState.players.find((p) => p.id === action.playerId)
        if (!caster) return

        const preStructuresMap = new Map(preState.structures.map((s) => [s.id, s]))
        const postStructuresMap = new Map(result.state.structures.map((s) => [s.id, s]))
        const hexMap = new Map(preState.board.map((h) => [h.id, h]))

        const structureDeltas: StructureDelta[] = []
        const playerDeltas: Record<string, number> = {}

        for (const [id, pre] of preStructuresMap.entries()) {
          const post = postStructuresMap.get(id)
          const terrain = hexMap.get(pre.hexId)?.terrain ?? 'Prairies'
          if (!post) {
            structureDeltas.push({
              structureId: id,
              hexId: pre.hexId,
              owner: pre.owner,
              structureType: pre.type,
              terrain,
              oldLevel: pre.level,
              newLevel: null,
              delta: -pre.level,
            })
            playerDeltas[pre.owner] = (playerDeltas[pre.owner] ?? 0) - pre.level
          } else if (post.level !== pre.level) {
            const delta = post.level - pre.level
            structureDeltas.push({
              structureId: id,
              hexId: pre.hexId,
              owner: pre.owner,
              structureType: pre.type,
              terrain,
              oldLevel: pre.level,
              newLevel: post.level,
              delta,
            })
            playerDeltas[pre.owner] = (playerDeltas[pre.owner] ?? 0) + delta
          }
        }

        if (structureDeltas.length === 0) return

        let logicCard: SpellAnimationData['logicCard'] = null
        let effectCard: SpellAnimationData['effectCard'] = null
        let tarotCard: SpellAnimationData['tarotCard'] = null

        if (action.type === 'CAST_SPELL') {
          const lc = caster.logicHand.find((c) => c.instanceId === action.logicCardId)
          const ec = caster.effectHand.find((c) => c.instanceId === action.effectCardId)
          const tc = preState.tarotRow.find((t) => t.instanceId === action.tarotId)
          if (lc) logicCard = { kind: lc.kind, label: LOGIC_CARD_LABELS[lc.kind] }
          if (ec) effectCard = { kind: ec.kind, label: EFFECT_CARD_LABELS[ec.kind] }
          if (tc) tarotCard = {
          label: `${tc.kind === 'minor' ? `${tc.suit} ${tc.rank}` : tc.id}`,
          artUrl: tarotArtUrl(tc),
          operandA: tc.kind === 'minor' ? tc.operandA : null,
          operandB: tc.kind === 'minor' ? tc.operandB : null,
        }
        }

        setSpellAnimation({
          casterId: action.playerId,
          logicCard,
          effectCard,
          tarotCard,
          structureDeltas,
          playerDeltas,
        })
      }
    } else {
      setLastError(result.error)
    }
  }

  const newGame = () => {
    const s = stateRef.current
    if (s && !s.winner) {
      const scores = Object.fromEntries(
        s.players.map((p) => [p.id, computeVP(s, p.id)]),
      )
      capture('game_abandoned', {
        phase: s.phase,
        scores,
        player_count: s.players.length,
      })
    }
    clearSavedGame()
    setState(null)
    setLastError(null)
    setPendingRulesOnStart(false)
    setSpellAnimation(null)
  }

  return (
    <GameContext.Provider
      value={{
        state,
        lastError,
        startGame,
        dispatch,
        newGame,
        pendingRulesOnStart,
        clearPendingRulesOnStart: () => setPendingRulesOnStart(false),
        spellAnimation,
        clearSpellAnimation,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
