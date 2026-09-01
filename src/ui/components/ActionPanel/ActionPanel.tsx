import { useCastingGesture } from '../../hooks/useCastingGesture'
import { useGameEngine } from '../../hooks/useGameEngine'
import { TarotRow } from '../TarotRow/TarotRow'
import { BuildPanel } from './BuildPanel'
import { CastingGestureOverlay } from './CastingGestureOverlay'
import { MajorArcanaPanel } from './MajorArcanaPanel'
import { OpponentChoicePanel, MajorChoiceWaitingPanel } from './OpponentChoicePanel'
import { SpellBuilder, type SpellSelection } from './SpellBuilder'
import { TriggerWindowPanel } from './TriggerWindowPanel'

const EMPTY_SELECTION: SpellSelection = { logicId: null, effectId: null, tarotId: null }

export function ActionPanel({
  selectedHexId,
  spellSelection,
  onSpellSelectionChange,
  wheelTargets,
  setWheelTargets,
  onPreviewTargetsChange,
}: {
  selectedHexId: string | null
  spellSelection: SpellSelection
  onSpellSelectionChange: (next: SpellSelection) => void
  wheelTargets: Set<string>
  setWheelTargets: (next: Set<string>) => void
  /** Reports which structures a Major Arcana form/trigger in progress would target, for board highlighting. */
  onPreviewTargetsChange: (ids: Set<string>) => void
}) {
  const { state, dispatch } = useGameEngine()
  const activePlayer = state?.players[state.activePlayerIndex]
  const logicHand = activePlayer ? activePlayer.logicHand : []
  const effectHand = activePlayer ? activePlayer.effectHand : []

  const handleCastSpell = () => {
    if (spellSelection.logicId && spellSelection.effectId && spellSelection.tarotId && activePlayer) {
      dispatch({
        type: 'CAST_SPELL',
        playerId: activePlayer.id,
        logicCardId: spellSelection.logicId,
        effectCardId: spellSelection.effectId,
        tarotId: spellSelection.tarotId,
      })
      onSpellSelectionChange(EMPTY_SELECTION)
    }
  }

  const gesture = useCastingGesture({
    tarotRow: state?.tarotRow || [],
    logicHand,
    effectHand,
    spellSelection,
    onSpellSelectionChange,
    onCastSpell: handleCastSpell,
    enabled: state?.phase === 'cast',
  })

  if (!state) return null

  if (state.phase === 'setup' || state.phase === 'build') {
    return <BuildPanel selectedHexId={selectedHexId} />
  }

  if (state.phase === 'cast') {
    // One tarot row, all cards clickable regardless of kind; selecting a card reveals the
    // matching cast pane below it — Logic/Effect picking for a minor, or that specific
    // major's own action, instead of minors being selectable inline while majors lived in
    // a separate always-visible button list underneath everything else.
    const selectedTarot = state.tarotRow.find((t) => t.instanceId === spellSelection.tarotId)

    return (
      <>
        <CastingGestureOverlay {...gesture} />
        {/* Left: which tarot card you're casting against/playing. */}
        <div className="action-panel tarot-pane">
          <TarotRow
            cards={state.tarotRow}
            selectedId={spellSelection.tarotId}
            // Only the targeted tarot changes here — logicId/effectId are deliberately carried
            // over rather than reset. Every Minor Arcana shares the same logic+effect
            // mechanic, so switching which one you're casting against shouldn't lose your
            // chosen operator/effect; Major Arcana forms don't read logicId/effectId at all,
            // so carrying them through a major selection is harmless (they're just waiting for
            // the next minor).
            onSelect={(id) => onSpellSelectionChange({ ...spellSelection, tarotId: id })}
            activeTarotId={gesture.activeTarotId}
            isDragging={gesture.isDragging}
          />
        </div>

        {/* Right: the actual casting mechanics for whatever's selected on the left. */}
        <div className="action-panel spell-pane">
          {!selectedTarot && (
            <p className="action-hint">Select a tarot card to cast a spell or play a major arcana action.</p>
          )}

          {selectedTarot?.kind === 'minor' && <SpellBuilder selection={spellSelection} onChange={onSpellSelectionChange} />}

          {selectedTarot?.kind === 'major' && (
            <MajorArcanaPanel
              activeMajorId={selectedTarot.id}
              onDeselect={() => onSpellSelectionChange(EMPTY_SELECTION)}
              wheelTargets={wheelTargets}
              setWheelTargets={setWheelTargets}
              selectedHexId={selectedHexId}
              onPreviewTargetsChange={onPreviewTargetsChange}
            />
          )}
        </div>
      </>
    )
  }

  if (state.phase === 'awaitingMajorChoice') {
    const isResponder = state.majorChoiceQueue?.[0] === activePlayer?.id
    if (isResponder) {
      return <OpponentChoicePanel />
    }
    return <MajorChoiceWaitingPanel />
  }

  return <TriggerWindowPanel onPreviewTargetsChange={onPreviewTargetsChange} />
}
