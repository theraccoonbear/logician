import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { applyAction } from '../engine/reducer'
import { createInitialGameState, type PlayerConfig } from '../engine/setup'
import type { GameAction } from '../engine/types/actions'
import type { GameState } from '../engine/types/state'
import type { LogicCardId, EffectCardId } from '../engine/types/cards'
import { LOGIC_CARD_LABELS, EFFECT_CARD_LABELS } from './cardLabels'
import { tarotArtUrl } from './tarotArt'
import { clearSavedGame, loadSavedGame, saveGame } from './persistence'

export interface StructureDelta {
  structureId: string
  hexId: string
  owner: string
  oldLevel: number
  newLevel: number | null
  delta: number
}

export interface SpellAnimationData {
  casterId: string
  logicCard: { kind: LogicCardId; label: string } | null
  effectCard: { kind: EffectCardId; label: string } | null
  tarotCard: { label: string; artUrl: string } | null
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
    setState(createInitialGameState(players))
    setLastError(null)
    setPendingRulesOnStart(Boolean(opts?.showRules))
    setSpellAnimation(null)
  }

  const clearSpellAnimation = useCallback(() => setSpellAnimation(null), [])

  const dispatch = (action: GameAction) => {
    const preState = stateRef.current
    if (!preState) return
    const result = applyAction(preState, action)
    if (result.ok) {
      setState(result.state)
      setLastError(null)

      if (action.type === 'CAST_SPELL' || action.type === 'PLAY_MAJOR_ARCANA') {
        const caster = preState.players.find((p) => p.id === action.playerId)
        if (!caster) return

        const preStructuresMap = new Map(preState.structures.map((s) => [s.id, s]))
        const postStructuresMap = new Map(result.state.structures.map((s) => [s.id, s]))

        const structureDeltas: StructureDelta[] = []
        const playerDeltas: Record<string, number> = {}

        for (const [id, pre] of preStructuresMap.entries()) {
          const post = postStructuresMap.get(id)
          if (!post) {
            structureDeltas.push({
              structureId: id,
              hexId: pre.hexId,
              owner: pre.owner,
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
          if (tc) tarotCard = { label: `${tc.kind === 'minor' ? `${tc.suit} ${tc.rank}` : tc.id}`, artUrl: tarotArtUrl(tc) }
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
