import { isForcedOperandMajor } from '../../../engine/majorArcana/forcedOperand'
import { IMPLEMENTED_MAJOR_ARCANA_IDS } from '../../../engine/majorArcana/registry'
import { isHoldCard } from '../../../engine/triggers'
import type { MajorArcanaId } from '../../../engine/types/tarot'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { describeMajorArcana } from '../../operandLabels'
import { useGameEngine } from '../../hooks/useGameEngine'
import { useTargetPreview } from '../../hooks/useTargetPreview'
import { ChariotForm } from './majorForms/ChariotForm'
import { DevilForm } from './majorForms/DevilForm'
import { ForcedOperandForm } from './majorForms/ForcedOperandForm'
import { HermitForm } from './majorForms/HermitForm'
import { MagicianForm } from './majorForms/MagicianForm'
import { StarForm } from './majorForms/StarForm'
import { StrengthForm } from './majorForms/StrengthForm'
import { TemperanceForm } from './majorForms/TemperanceForm'
import { TowerForm } from './majorForms/TowerForm'
import { WorldForm } from './majorForms/WorldForm'

export function MajorArcanaPanel({
  activeMajorId,
  onDeselect,
  wheelTargets,
  setWheelTargets,
  selectedHexId,
  onPreviewTargetsChange,
}: {
  activeMajorId: MajorArcanaId
  onDeselect: () => void
  wheelTargets: Set<string>
  setWheelTargets: (next: Set<string>) => void
  selectedHexId: string | null
  onPreviewTargetsChange: (ids: Set<string>) => void
}) {
  const { state, dispatch, lastError } = useGameEngine()

  // Death/Judgement have no form (no choices to make) — their targets are the whole board,
  // computable with zero interaction, so preview them as soon as either is the active major.
  const deathJudgementPreview =
    activeMajorId === 'DEATH'
      ? new Set((state?.structures ?? []).filter((s) => s.type !== 'Fortress' && s.level <= 2).map((s) => s.id))
      : activeMajorId === 'JUDGEMENT'
        ? new Set((state?.structures ?? []).map((s) => s.id))
        : new Set<string>()
  useTargetPreview(deathJudgementPreview, onPreviewTargetsChange)

  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const activeTarot = state.tarotRow.find((t) => t.kind === 'major' && t.id === activeMajorId)
  if (!activeTarot) return null

  const play = (params?: unknown) => {
    if (!activeTarot) return
    dispatch({ type: 'PLAY_MAJOR_ARCANA', playerId: player.id, tarotId: activeTarot.instanceId, params })
    onDeselect()
    setWheelTargets(new Set())
  }
  const cancel = onDeselect

  const holdable = isHoldCard(activeMajorId) || activeMajorId === 'HIGH_PRIESTESS'
  const implemented = holdable || IMPLEMENTED_MAJOR_ARCANA_IDS.has(activeMajorId)

  return (
    <div className="major-arcana-panel">
      <p className="action-hint">{MAJOR_ARCANA_DESCRIPTIONS[activeMajorId]}</p>

      {holdable && (
        <div className="action-buttons">
          <button
            className="action-button"
            onClick={() => {
              dispatch({ type: 'TAKE_HOLD_CARD', playerId: player.id, tarotId: activeTarot.instanceId })
              onDeselect()
            }}
          >
            Take &amp; Hold {describeMajorArcana(activeMajorId)}
          </button>
          <button className="action-button secondary" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      {!holdable && !implemented && (
        <div className="action-buttons">
          <button className="action-button secondary" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}

      {activeMajorId === 'WHEEL' && (
        <div className="major-arcana-form">
          <p>Click exactly 3 unfortified structures on the board. Selected: {wheelTargets.size}/3</p>
          <div className="action-buttons">
            <button className="action-button" disabled={wheelTargets.size !== 3} onClick={() => play({ structureIds: [...wheelTargets] })}>
              Confirm Wheel of Fortune
            </button>
            <button className="action-button secondary" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {activeMajorId === 'HERMIT' && <HermitForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'CHARIOT' && (
        <ChariotForm selectedHexId={selectedHexId} onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />
      )}
      {activeMajorId === 'DEVIL' && <DevilForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />}
      {activeMajorId === 'WORLD' && <WorldForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />}
      {activeMajorId === 'MAGICIAN' && <MagicianForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'TOWER' && <TowerForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />}
      {activeMajorId === 'STRENGTH' && <StrengthForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />}
      {activeMajorId === 'STAR' && <StarForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />}
      {activeMajorId === 'TEMPERANCE' && (
        <TemperanceForm onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />
      )}
      {activeMajorId && activeTarot?.kind === 'major' && isForcedOperandMajor(activeTarot.id) && (
        <ForcedOperandForm tarot={activeTarot} onConfirm={play} onCancel={cancel} onPreviewTargetsChange={onPreviewTargetsChange} />
      )}

      {(activeMajorId === 'DEATH' || activeMajorId === 'JUDGEMENT') && (
        <div className="major-arcana-form">
          <p>{activeMajorId === 'DEATH' ? 'Destroy all structures at level 2 or below, everywhere.' : 'Minimize every structure on the board.'}</p>
          <div className="action-buttons">
            <button className="action-button" onClick={() => play()}>
              Confirm {describeMajorArcana(activeMajorId)}
            </button>
            <button className="action-button secondary" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
