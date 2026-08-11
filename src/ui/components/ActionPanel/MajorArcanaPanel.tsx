import { isForcedOperandMajor } from '../../../engine/majorArcana/forcedOperand'
import { IMPLEMENTED_MAJOR_ARCANA_IDS } from '../../../engine/majorArcana/registry'
import { isHoldCard } from '../../../engine/triggers'
import type { MajorArcanaId } from '../../../engine/types/tarot'
import { MAJOR_ARCANA_DESCRIPTIONS } from '../../majorArcanaDescriptions'
import { describeMajorArcana } from '../../operandLabels'
import { useGameEngine } from '../../hooks/useGameEngine'
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
  setActiveMajorId,
  wheelTargets,
  setWheelTargets,
  selectedHexId,
}: {
  activeMajorId: MajorArcanaId | null
  setActiveMajorId: (id: MajorArcanaId | null) => void
  wheelTargets: Set<string>
  setWheelTargets: (next: Set<string>) => void
  selectedHexId: string | null
}) {
  const { state, dispatch, lastError } = useGameEngine()
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const majorCards = state.tarotRow.filter((t) => t.kind === 'major')
  if (majorCards.length === 0) return null

  const activeTarot = state.tarotRow.find((t) => t.kind === 'major' && t.id === activeMajorId)

  const play = (params?: unknown) => {
    if (!activeTarot) return
    dispatch({ type: 'PLAY_MAJOR_ARCANA', playerId: player.id, tarotId: activeTarot.instanceId, params })
    setActiveMajorId(null)
    setWheelTargets(new Set())
  }
  const cancel = () => setActiveMajorId(null)

  return (
    <div className="major-arcana-panel">
      <div className="card-hand-label">Or Play a Major Arcana Action</div>
      <div className="major-arcana-choices">
        {majorCards.map((tarot) => {
          if (tarot.kind !== 'major') return null
          const holdable = isHoldCard(tarot.id) || tarot.id === 'HIGH_PRIESTESS'
          if (holdable) {
            return (
              <button
                key={tarot.instanceId}
                className="card-button"
                onClick={() => dispatch({ type: 'TAKE_HOLD_CARD', playerId: player.id, tarotId: tarot.instanceId })}
                title={`${MAJOR_ARCANA_DESCRIPTIONS[tarot.id]} (taken now, played later)`}
              >
                Take {describeMajorArcana(tarot.id)}
              </button>
            )
          }
          const implemented = IMPLEMENTED_MAJOR_ARCANA_IDS.has(tarot.id)
          return (
            <button
              key={tarot.instanceId}
              className={`card-button ${activeMajorId === tarot.id ? 'is-selected' : ''}`}
              disabled={!implemented}
              title={implemented ? MAJOR_ARCANA_DESCRIPTIONS[tarot.id] : 'Not implemented yet'}
              onClick={() => setActiveMajorId(tarot.id)}
            >
              {describeMajorArcana(tarot.id)}
            </button>
          )
        })}
      </div>

      {activeMajorId && <p className="action-hint">{MAJOR_ARCANA_DESCRIPTIONS[activeMajorId]}</p>}

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
      {activeMajorId === 'CHARIOT' && <ChariotForm selectedHexId={selectedHexId} onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'DEVIL' && <DevilForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'WORLD' && <WorldForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'MAGICIAN' && <MagicianForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'TOWER' && <TowerForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'STRENGTH' && <StrengthForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'STAR' && <StarForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId === 'TEMPERANCE' && <TemperanceForm onConfirm={play} onCancel={cancel} />}
      {activeMajorId && activeTarot?.kind === 'major' && isForcedOperandMajor(activeTarot.id) && (
        <ForcedOperandForm tarot={activeTarot} onConfirm={play} onCancel={cancel} />
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
