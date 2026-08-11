import type { MajorArcanaId } from '../../../engine/types/tarot'
import { useGameEngine } from '../../hooks/useGameEngine'
import { BuildPanel } from './BuildPanel'
import { MajorArcanaPanel } from './MajorArcanaPanel'
import { SpellBuilder, type SpellSelection } from './SpellBuilder'
import { TriggerWindowPanel } from './TriggerWindowPanel'

export function ActionPanel({
  selectedHexId,
  spellSelection,
  onSpellSelectionChange,
  activeMajorId,
  setActiveMajorId,
  wheelTargets,
  setWheelTargets,
}: {
  selectedHexId: string | null
  spellSelection: SpellSelection
  onSpellSelectionChange: (next: SpellSelection) => void
  activeMajorId: MajorArcanaId | null
  setActiveMajorId: (id: MajorArcanaId | null) => void
  wheelTargets: Set<string>
  setWheelTargets: (next: Set<string>) => void
}) {
  const { state } = useGameEngine()
  if (!state) return null

  if (state.phase === 'setup' || state.phase === 'build') {
    return <BuildPanel selectedHexId={selectedHexId} />
  }

  if (state.phase === 'cast') {
    return (
      <>
        <SpellBuilder selection={spellSelection} onChange={onSpellSelectionChange} />
        <MajorArcanaPanel
          activeMajorId={activeMajorId}
          setActiveMajorId={setActiveMajorId}
          wheelTargets={wheelTargets}
          setWheelTargets={setWheelTargets}
          selectedHexId={selectedHexId}
        />
      </>
    )
  }

  return <TriggerWindowPanel />
}
