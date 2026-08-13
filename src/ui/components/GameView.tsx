import { useEffect, useMemo, useState } from 'react'
import { getAffectedStructures } from '../../engine/selectors'
import { useAITurns } from '../hooks/useAITurns'
import { useGameEngine } from '../hooks/useGameEngine'
import { ActionPanel } from './ActionPanel/ActionPanel'
import type { SpellSelection } from './ActionPanel/SpellBuilder'
import { Board } from './Board/Board'
import { GameLog } from './GameLog'
import { TurnIndicator } from './TurnIndicator'
import { VPTracker } from './VPTracker'

const EMPTY_SELECTION: SpellSelection = { logicId: null, effectId: null, tarotId: null }
const MAX_WHEEL_TARGETS = 3

export function GameView() {
  const { state, newGame } = useGameEngine()
  useAITurns()
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null)
  const [spellSelection, setSpellSelection] = useState<SpellSelection>(EMPTY_SELECTION)
  const [wheelTargets, setWheelTargets] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedHexId(null)
    setSpellSelection(EMPTY_SELECTION)
    setWheelTargets(new Set())
  }, [state?.activePlayerIndex, state?.phase])

  // Derived, not separately tracked: which major arcana (if any) is selected in the tarot
  // row right now. Single source of truth is spellSelection.tarotId, shared with the minor
  // logic/effect picking flow — see ActionPanel.
  const selectedTarot = state?.tarotRow.find((t) => t.instanceId === spellSelection.tarotId)
  const activeMajorId = selectedTarot?.kind === 'major' ? selectedTarot.id : null

  const highlightedIds = useMemo(() => {
    if (!state || !spellSelection.logicId || !spellSelection.tarotId) return new Set<string>()
    const player = state.players[state.activePlayerIndex]
    const logicCard = player.logicHand.find((c) => c.instanceId === spellSelection.logicId)
    const tarot = state.tarotRow.find((t) => t.instanceId === spellSelection.tarotId)
    if (!logicCard || !tarot || tarot.kind !== 'minor') return new Set<string>()
    const affected = getAffectedStructures(state, {
      logicCardId: logicCard.kind,
      operandA: tarot.operandA,
      operandB: tarot.operandB,
    })
    return new Set(affected.map((s) => s.id))
  }, [state, spellSelection])

  if (!state) return null

  const currentActor =
    state.phase === 'awaitingTrigger'
      ? state.players.find((p) => p.id === state.triggerQueue?.[0])
      : state.players[state.activePlayerIndex]
  const waitingOnAI = Boolean(currentActor?.isAI) && !state.winner

  const handleStructureClick = (structure: { id: string; fortressed: boolean }) => {
    if (activeMajorId !== 'WHEEL' || structure.fortressed) return
    const next = new Set(wheelTargets)
    if (next.has(structure.id)) {
      next.delete(structure.id)
    } else if (next.size < MAX_WHEEL_TARGETS) {
      next.add(structure.id)
    }
    setWheelTargets(next)
  }

  return (
    <div className="game-view">
      {state.winner && (
        <div className="winner-banner">{state.players.find((p) => p.id === state.winner)?.name} wins!</div>
      )}
      <div className="game-header">
        <img className="game-logo" src="/img/logician.png" alt="Logician" />
        <TurnIndicator state={state} />
        <VPTracker state={state} />
        <button
          className="action-button secondary"
          onClick={() => {
            if (window.confirm('Start a new game? This will discard the current game.')) newGame()
          }}
        >
          New Game
        </button>
      </div>
      <div className="game-body">
        <Board
          state={state}
          highlightedIds={highlightedIds}
          selectedHexId={selectedHexId}
          onHexClick={setSelectedHexId}
          selectedStructureIds={activeMajorId === 'WHEEL' ? wheelTargets : undefined}
          onStructureClick={activeMajorId === 'WHEEL' ? handleStructureClick : undefined}
        />
        <div className="game-sidebar">
          {waitingOnAI ? (
            <div className="action-panel ai-thinking">🤖 {currentActor?.name} is thinking…</div>
          ) : (
            <ActionPanel
              selectedHexId={selectedHexId}
              spellSelection={spellSelection}
              onSpellSelectionChange={setSpellSelection}
              wheelTargets={wheelTargets}
              setWheelTargets={setWheelTargets}
            />
          )}
          <GameLog log={state.log} />
        </div>
      </div>
    </div>
  )
}
