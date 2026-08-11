import { useState } from 'react'
import { computeVP } from '../../../../engine/selectors'
import { LEVEL_BOUNDS } from '../../../../engine/types/structure'
import type { StructureType } from '../../../../engine/types/structure'
import { useGameEngine } from '../../../hooks/useGameEngine'

const BASIC_TYPES: StructureType[] = ['Pool', 'Pyramid', 'Tower']

interface Build {
  hexId: string
  structureType: StructureType
}

export function StarForm({ onConfirm, onCancel }: { onConfirm: (params: unknown) => void; onCancel: () => void }) {
  const { state } = useGameEngine()
  const [upgrades, setUpgrades] = useState<Record<string, number>>({})
  const [builds, setBuilds] = useState<Record<string, Build[]>>({})
  if (!state) return null

  const maxVP = Math.max(...state.players.map((p) => computeVP(state, p.id)))
  const laggards = state.players.filter((p) => computeVP(state, p.id) < maxVP)

  const gainedFor = (playerId: string) => {
    const theirStructures = state.structures.filter((s) => s.owner === playerId)
    const upgradeGain = theirStructures.reduce((sum, s) => sum + ((upgrades[s.id] ?? s.level) - s.level), 0)
    const buildGain = (builds[playerId] ?? []).reduce((sum, b) => sum + LEVEL_BOUNDS[b.structureType].floor, 0)
    return upgradeGain + buildGain
  }

  const addBuild = (playerId: string) => {
    setBuilds({ ...builds, [playerId]: [...(builds[playerId] ?? []), { hexId: state.board[0].id, structureType: 'Pool' }] })
  }
  const updateBuild = (playerId: string, index: number, patch: Partial<Build>) => {
    const list = [...(builds[playerId] ?? [])]
    list[index] = { ...list[index], ...patch }
    setBuilds({ ...builds, [playerId]: list })
  }
  const removeBuild = (playerId: string, index: number) => {
    setBuilds({ ...builds, [playerId]: (builds[playerId] ?? []).filter((_, i) => i !== index) })
  }

  const allSatisfied = laggards.every((p) => gainedFor(p.id) === maxVP - computeVP(state, p.id))

  const confirm = () => {
    const playerAdjustments: Record<string, { upgrades: Array<{ structureId: string; newLevel: number }>; builds: Build[] }> = {}
    for (const p of laggards) {
      const theirStructures = state.structures.filter((s) => s.owner === p.id)
      playerAdjustments[p.id] = {
        upgrades: theirStructures.filter((s) => (upgrades[s.id] ?? s.level) !== s.level).map((s) => ({ structureId: s.id, newLevel: upgrades[s.id] })),
        builds: builds[p.id] ?? [],
      }
    }
    onConfirm({ playerAdjustments })
  }

  return (
    <div className="major-arcana-form">
      <p>Every player below the max VP ({maxVP}) may upgrade or build until they reach it exactly.</p>
      {laggards.length === 0 && <p>Everyone is already tied at the max — nothing to do.</p>}
      {laggards.map((p) => {
        const original = computeVP(state, p.id)
        const required = maxVP - original
        const gained = gainedFor(p.id)
        return (
          <div className="major-arcana-form" key={p.id}>
            <p>
              <strong>{p.name}</strong>: needs +{required} VP (currently {gained}/{required})
            </p>
            {state.structures
              .filter((s) => s.owner === p.id)
              .map((s) => (
                <div className="redistribute-row" key={s.id}>
                  <span>
                    {s.type} on {s.hexId} (Lv.{s.level})
                  </span>
                  <input
                    type="number"
                    disabled={s.fortressed}
                    value={upgrades[s.id] ?? s.level}
                    min={s.level}
                    onChange={(e) => setUpgrades({ ...upgrades, [s.id]: Number(e.target.value) })}
                  />
                </div>
              ))}
            {(builds[p.id] ?? []).map((b, i) => (
              <div className="redistribute-row" key={i}>
                <select value={b.hexId} onChange={(e) => updateBuild(p.id, i, { hexId: e.target.value })}>
                  {state.board.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.id}
                    </option>
                  ))}
                </select>
                <select value={b.structureType} onChange={(e) => updateBuild(p.id, i, { structureType: e.target.value as StructureType })}>
                  {BASIC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button className="action-button secondary" onClick={() => removeBuild(p.id, i)}>
                  Remove
                </button>
              </div>
            ))}
            <button className="action-button secondary" onClick={() => addBuild(p.id)}>
              + Add a new structure
            </button>
          </div>
        )
      })}
      <div className="action-buttons">
        <button className="action-button" disabled={!allSatisfied} onClick={confirm}>
          Confirm The Star
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
