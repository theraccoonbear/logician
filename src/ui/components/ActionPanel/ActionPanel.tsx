import { useGameEngine } from '../../hooks/useGameEngine'
import { TarotRow } from '../TarotRow/TarotRow'
import { BuildPanel } from './BuildPanel'
import { MajorArcanaPanel } from './MajorArcanaPanel'
import { SpellBuilder, type SpellSelection } from './SpellBuilder'
import { TriggerWindowPanel } from './TriggerWindowPanel'

const EMPTY_SELECTION: SpellSelection = { logicId: null, effectId: null, tarotId: null }

export function ActionPanel({
  selectedHexId,
  spellSelection,
  onSpellSelectionChange,
  wheelTargets,
  setWheelTargets,
}: {
  selectedHexId: string | null
  spellSelection: SpellSelection
  onSpellSelectionChange: (next: SpellSelection) => void
  wheelTargets: Set<string>
  setWheelTargets: (next: Set<string>) => void
}) {
  const { state } = useGameEngine()
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
      <div className="action-panel">
        <TarotRow
          cards={state.tarotRow}
          selectedId={spellSelection.tarotId}
          onSelect={(id) => onSpellSelectionChange({ ...EMPTY_SELECTION, tarotId: id })}
        />

        {!selectedTarot && (
          <p className="action-hint">Select a tarot card above to cast a spell or play a major arcana action.</p>
        )}

        {selectedTarot?.kind === 'minor' && <SpellBuilder selection={spellSelection} onChange={onSpellSelectionChange} />}

        {selectedTarot?.kind === 'major' && (
          <MajorArcanaPanel
            activeMajorId={selectedTarot.id}
            onDeselect={() => onSpellSelectionChange(EMPTY_SELECTION)}
            wheelTargets={wheelTargets}
            setWheelTargets={setWheelTargets}
            selectedHexId={selectedHexId}
          />
        )}
      </div>
    )
  }

  return <TriggerWindowPanel />
}
