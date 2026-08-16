import { useEffect, useMemo, useState } from 'react'
import { getAffectedStructures } from '../../engine/selectors'
import { assetUrl } from '../assetUrl'
import { useAITurns } from '../hooks/useAITurns'
import { useFitScale } from '../hooks/useFitScale'
import { useGameEngine } from '../hooks/useGameEngine'
import { ActionPanel } from './ActionPanel/ActionPanel'
import type { SpellSelection } from './ActionPanel/SpellBuilder'
import { Board } from './Board/Board'
import { GameLog } from './GameLog'
import { MenuBar } from './MenuBar'
import { RulesModal } from './RulesModal'
import { TurnIndicator } from './TurnIndicator'
import { VPTracker } from './VPTracker'

import type { AssistanceLevel } from '../../engine/types/state'

const EMPTY_SELECTION: SpellSelection = { logicId: null, effectId: null, tarotId: null }
const MAX_WHEEL_TARGETS = 3

export function GameView() {
  const { state, newGame, pendingRulesOnStart, clearPendingRulesOnStart, dispatch } = useGameEngine()
  useAITurns()
  const { containerRef: fieldRef, contentRef: boardRef, scale: boardScale } = useFitScale<HTMLDivElement, HTMLDivElement>()
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null)
  const [spellSelection, setSpellSelection] = useState<SpellSelection>(EMPTY_SELECTION)
  const [wheelTargets, setWheelTargets] = useState<Set<string>>(new Set())
  const [helpOpen, setHelpOpen] = useState(false)
  // Live target preview for whichever Major Arcana form/trigger is currently being filled
  // out — reported up from ActionPanel via useTargetPreview. Minor-arcana spells have their
  // own highlightedIds below; the two are unioned when passed to Board, since only one is
  // ever non-empty at a time (they correspond to mutually exclusive selection states).
  const [majorPreviewIds, setMajorPreviewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelectedHexId(null)
    setSpellSelection(EMPTY_SELECTION)
    setWheelTargets(new Set())
    setMajorPreviewIds(new Set())
  }, [state?.activePlayerIndex, state?.phase])

  // Auto-open the rules once, right after a fresh game starts with the "show rules" setup
  // preference checked — not on every reload of a saved-in-progress game.
  useEffect(() => {
    if (pendingRulesOnStart) {
      setHelpOpen(true)
      clearPendingRulesOnStart()
    }
  }, [pendingRulesOnStart, clearPendingRulesOnStart])

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

  // Union, not either/or: minor-spell highlighting and major-arcana preview highlighting
  // correspond to mutually exclusive selection states (a minor tarot+logic pair vs. a major
  // arcana form/trigger in progress), so at most one side is ever non-empty at once.
  // Suppressed completely if the active player has "No Assistance" ('none') enabled.
  const boardHighlightedIds = useMemo(() => {
    const player = state?.players[state.activePlayerIndex]
    if (player?.assistanceLevel === 'none') {
      return new Set<string>()
    }
    return new Set([...highlightedIds, ...majorPreviewIds])
  }, [state, highlightedIds, majorPreviewIds, spellSelection])

  if (!state) return null

  const currentActor =
    state.phase === 'awaitingTrigger'
      ? state.players.find((p) => p.id === state.triggerQueue?.[0])
      : state.players[state.activePlayerIndex]
  const waitingOnAI = Boolean(currentActor?.isAI) && !state.winner

  // Selecting a hex only does something during build (choosing where to place) or when the
  // Chariot major arcana is active (choosing which hex to redistribute) — otherwise it's just
  // a clickable-looking tile that does nothing, which reads as a bug rather than a no-op.
  const hexSelectionEnabled = state.phase === 'setup' || state.phase === 'build' || activeMajorId === 'CHARIOT'

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
      {helpOpen && <RulesModal onClose={() => setHelpOpen(false)} />}
      {state.winner && (
        <div className="winner-banner">{state.players.find((p) => p.id === state.winner)?.name} wins!</div>
      )}
      {/* Zone 1: title / new game — its own row, with room for future menu items alongside. */}
      <div className="title-row">
        <img className="game-logo" src={assetUrl('/img/logician.png')} alt="Logician" />
        <MenuBar
          onNewGame={() => {
            if (window.confirm('Start a new game? This will discard the current game.')) newGame()
          }}
          onHelp={() => setHelpOpen(true)}
        />
      </div>

      {/* Zone 2: turn / score. */}
      <div className="score-row">
        <TurnIndicator state={state} />
        <VPTracker state={state} />
        {currentActor && !currentActor.isAI && (
          <div className="in-game-assistance">
            <span className="in-game-assistance-label">Assistance:</span>
            <select
              className="in-game-assistance-select"
              value={currentActor.assistanceLevel ?? 'none'}
              onChange={(e) =>
                dispatch({
                  type: 'SET_ASSISTANCE_LEVEL',
                  playerId: currentActor.id,
                  assistanceLevel: e.target.value as AssistanceLevel,
                })
              }
            >
              <option value="none">None (Wizard Eyes 🧙‍♂️👀)</option>
              <option value="some">Some</option>
              <option value="full">Full</option>
            </select>
          </div>
        )}
      </div>

      {/* Zone 3: card selection (left) and the actual cast/spell mechanics (right) — above the
          board now, right under turn/score, and stacked into a single column on narrow/portrait
          screens instead of side by side (see .cards-row in App.css). */}
      <div className="cards-row">
        {waitingOnAI ? (
          <div className="action-panel ai-thinking">🤖 {currentActor?.name} is thinking…</div>
        ) : (
          <ActionPanel
            selectedHexId={selectedHexId}
            spellSelection={spellSelection}
            onSpellSelectionChange={setSpellSelection}
            wheelTargets={wheelTargets}
            setWheelTargets={setWheelTargets}
            onPreviewTargetsChange={setMajorPreviewIds}
          />
        )}
      </div>

      {/* Zone 4: the game field. Board.tsx itself picks a portrait (tall, flat-top hexes in
          columns) or landscape (wide, pointy-top hexes in rows) layout based on viewport
          orientation — see useOrientation. Scaled down (never up) via useFitScale so a board
          wider than the available space shrinks to fit instead of overflowing into a
          scrollbar — hex sizes are fixed px values tuned per orientation, not fluid. */}
      <div className="game-field" ref={fieldRef}>
        <div ref={boardRef} style={{ transform: `scale(${boardScale})`, transformOrigin: 'top center' }}>
          <Board
            state={state}
            highlightedIds={boardHighlightedIds}
            selectedHexId={hexSelectionEnabled ? selectedHexId : null}
            onHexClick={hexSelectionEnabled ? setSelectedHexId : undefined}
            selectedStructureIds={activeMajorId === 'WHEEL' ? wheelTargets : undefined}
            onStructureClick={activeMajorId === 'WHEEL' ? handleStructureClick : undefined}
          />
        </div>
      </div>

      {/* Zone 5: the game log, always last, full width on its own. */}
      <div className="log-row">
        <GameLog log={state.log} />
      </div>
    </div>
  )
}
