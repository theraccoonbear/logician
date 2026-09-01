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

export function StarAdjustmentForm({
  responderId,
  onConfirm,
}: {
  responderId: string
  onConfirm: (adjustments: Record<string, { upgrades: Array<{ structureId: string; newLevel: number }>; builds: Build[] }>) => void
}) {
  const { state } = useGameEngine()
  const [upgrades, setUpgrades] = useState<Record<string, number>>({})
  const [builds, setBuilds] = useState<Build[]>([])

  if (!state) return null

  const maxVP = Math.max(...state.players.map((p) => computeVP(state, p.id)))
  const currentVP = computeVP(state, responderId)
  const required = maxVP - currentVP
  const theirStructures = state.structures.filter((s) => s.owner === responderId)

  const upgradeGain = theirStructures.reduce((sum, s) => sum + ((upgrades[s.id] ?? s.level) - s.level), 0)
  const buildGain = builds.reduce((sum, b) => sum + LEVEL_BOUNDS[b.structureType].floor, 0)
  const gained = upgradeGain + buildGain

  const addBuild = () => {
    setBuilds([...builds, { hexId: state.board[0].id, structureType: 'Pool' }])
  }
  const updateBuild = (index: number, patch: Partial<Build>) => {
    const list = [...builds]
    list[index] = { ...list[index], ...patch }
    setBuilds(list)
  }
  const removeBuild = (index: number) => {
    setBuilds(builds.filter((_, i) => i !== index))
  }

  const confirm = () => {
    const playerAdjustments: Record<string, { upgrades: Array<{ structureId: string; newLevel: number }>; builds: Build[] }> = {}
    playerAdjustments[responderId] = {
      upgrades: theirStructures.filter((s) => (upgrades[s.id] ?? s.level) !== s.level).map((s) => ({ structureId: s.id, newLevel: upgrades[s.id] })),
      builds,
    }
    onConfirm(playerAdjustments)
  }

  return (
    <div className="major-arcana-form">
      <p>You need +{required} VP (currently {gained}/{required}). Upgrade your structures or add new ones.</p>
      {theirStructures.map((s) => (
        <div className="redistribute-row" key={s.id}>
          <span>{s.type} on {s.hexId} (Lv.{s.level})</span>
          <input
            type="number"
            disabled={s.fortressed}
            value={upgrades[s.id] ?? s.level}
            min={s.level}
            onChange={(e) => setUpgrades({ ...upgrades, [s.id]: Number(e.target.value) })}
          />
        </div>
      ))}
      {builds.map((b, i) => (
        <div className="redistribute-row" key={i}>
          <select value={b.hexId} onChange={(e) => updateBuild(i, { hexId: e.target.value })}>
            {state.board.map((h) => (
              <option key={h.id} value={h.id}>{h.id}</option>
            ))}
          </select>
          <select value={b.structureType} onChange={(e) => updateBuild(i, { structureType: e.target.value as StructureType })}>
            {BASIC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button className="action-button secondary" onClick={() => removeBuild(i)}>Remove</button>
        </div>
      ))}
      <button className="action-button secondary" onClick={addBuild}>+ Add a new structure</button>
      <div className="action-buttons">
        <button className="action-button" disabled={gained !== required} onClick={confirm}>
          Confirm
        </button>
      </div>
    </div>
  )
}

export function TemperanceAdjustmentForm({
  responderId,
  onConfirm,
}: {
  responderId: string
  onConfirm: (adjustments: Record<string, Array<{ structureId: string; newLevel: number }>>) => void
}) {
  const { state } = useGameEngine()
  const [levels, setLevels] = useState<Record<string, number>>({})

  if (!state) return null

  const minVP = Math.min(...state.players.map((p) => computeVP(state, p.id)))
  const currentVP = computeVP(state, responderId)
  const required = currentVP - minVP
  const theirStructures = state.structures.filter((s) => s.owner === responderId)

  const lost = theirStructures.reduce((sum, s) => {
    const newLevel = levels[s.id] ?? s.level
    return sum + (newLevel === 0 ? s.level : s.level - newLevel)
  }, 0)

  const confirm = () => {
    const adjustments = theirStructures
      .filter((s) => (levels[s.id] ?? s.level) !== s.level)
      .map((s) => ({ structureId: s.id, newLevel: levels[s.id] }))
    onConfirm({ [responderId]: adjustments })
  }

  return (
    <div className="major-arcana-form">
      <p>You must lose {required} VP (currently {lost}/{required}). Set a level of 0 to destroy.</p>
      {theirStructures.map((s) => (
        <div className="redistribute-row" key={s.id}>
          <span>{s.type} on {s.hexId} (Lv.{s.level})</span>
          <input
            type="number"
            disabled={s.fortressed}
            value={levels[s.id] ?? s.level}
            max={s.level}
            min={0}
            onChange={(e) => setLevels({ ...levels, [s.id]: Number(e.target.value) })}
          />
        </div>
      ))}
      <div className="action-buttons">
        <button className="action-button" disabled={lost !== required} onClick={confirm}>
          Confirm
        </button>
      </div>
    </div>
  )
}
