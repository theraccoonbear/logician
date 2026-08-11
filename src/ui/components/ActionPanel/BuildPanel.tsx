import { useState } from 'react'
import { canBuildBasic, canBuildFortress } from '../../../engine/selectors'
import type { StructureType } from '../../../engine/types/structure'
import { useGameEngine } from '../../hooks/useGameEngine'

const BASIC_TYPES: StructureType[] = ['Pool', 'Pyramid', 'Tower']

export function BuildPanel({ selectedHexId }: { selectedHexId: string | null }) {
  const { state, dispatch, lastError } = useGameEngine()
  const [useHighPriestess, setUseHighPriestess] = useState(false)
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const isSetup = state.phase === 'setup'
  const priestessCard = player.heldMajorArcana.find((c) => c.id === 'HIGH_PRIESTESS')

  const build = (structureType: StructureType) => {
    if (!selectedHexId) return
    dispatch({
      type: 'BUILD_STRUCTURE',
      playerId: player.id,
      hexId: selectedHexId,
      structureType,
      playHighPriestessCardId: useHighPriestess && priestessCard ? priestessCard.instanceId : undefined,
    })
  }

  return (
    <div className="action-panel">
      <p className="action-hint">
        {selectedHexId ? `Selected hex: ${selectedHexId}` : 'Select a hex on the board to build on.'}
      </p>
      {!isSetup && priestessCard && (
        <label className="action-hint" style={{ display: 'block' }}>
          <input type="checkbox" checked={useHighPriestess} onChange={(e) => setUseHighPriestess(e.target.checked)} /> Boost this build with
          the High Priestess (enters at level 3, or 2 for a Fortress)
        </label>
      )}
      <div className="action-buttons">
        {BASIC_TYPES.map((type) => {
          const eligible =
            selectedHexId !== null &&
            (isSetup
              ? !state.structures.some((s) => s.owner === player.id && s.type === type)
              : canBuildBasic(state, player.id, selectedHexId, type))
          return (
            <button key={type} className="action-button" disabled={!eligible} onClick={() => build(type)}>
              Build {type}
            </button>
          )
        })}
        {!isSetup && (
          <button
            className="action-button"
            disabled={!selectedHexId || !canBuildFortress(state, player.id, selectedHexId)}
            onClick={() => build('Fortress')}
          >
            Build Fortress
          </button>
        )}
        {!isSetup && (
          <button className="action-button secondary" onClick={() => dispatch({ type: 'SKIP_BUILD', playerId: player.id })}>
            Skip Build
          </button>
        )}
      </div>
      {lastError && <p className="action-error">{lastError}</p>}
    </div>
  )
}
