import { useState } from 'react'
import { computeVP } from '../../../../engine/selectors'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'

export function TemperanceForm({
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [levels, setLevels] = useState<Record<string, number>>({})

  // Who's affected doesn't depend on any choice — every affected player's existing structures
  // are previewable the instant the form opens, before any downgrade amounts are entered.
  const previewIds = new Set<string>()
  if (state) {
    const minVPNow = Math.min(...state.players.map((p) => computeVP(state, p.id)))
    const affectedIds = new Set(state.players.filter((p) => computeVP(state, p.id) > minVPNow).map((p) => p.id))
    for (const s of state.structures) if (affectedIds.has(s.owner)) previewIds.add(s.id)
  }
  useTargetPreview(previewIds, onPreviewTargetsChange)

  if (!state) return null

  const minVP = Math.min(...state.players.map((p) => computeVP(state, p.id)))
  const affected = state.players.filter((p) => computeVP(state, p.id) > minVP)

  const lostFor = (playerId: string) => {
    const theirs = state.structures.filter((s) => s.owner === playerId)
    return theirs.reduce((sum, s) => {
      const newLevel = levels[s.id] ?? s.level
      return sum + (newLevel === 0 ? s.level : s.level - newLevel)
    }, 0)
  }

  const allSatisfied = affected.every((p) => lostFor(p.id) === computeVP(state, p.id) - minVP)

  const confirm = () => {
    const playerAdjustments: Record<string, Array<{ structureId: string; newLevel: number }>> = {}
    for (const p of affected) {
      const theirs = state.structures.filter((s) => s.owner === p.id)
      playerAdjustments[p.id] = theirs
        .filter((s) => (levels[s.id] ?? s.level) !== s.level)
        .map((s) => ({ structureId: s.id, newLevel: levels[s.id] }))
    }
    onConfirm({ playerAdjustments })
  }

  return (
    <div className="major-arcana-form">
      <p>Every player above the minimum VP ({minVP}) must downgrade or destroy their own structures until they reach it exactly. Set a level of 0 to destroy.</p>
      {affected.map((p) => {
        const required = computeVP(state, p.id) - minVP
        const lost = lostFor(p.id)
        return (
          <div className="major-arcana-form" key={p.id}>
            <p>
              <strong>{p.name}</strong>: must lose {required} VP (currently {lost}/{required})
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
                    value={levels[s.id] ?? s.level}
                    max={s.level}
                    min={0}
                    onChange={(e) => setLevels({ ...levels, [s.id]: Number(e.target.value) })}
                  />
                </div>
              ))}
          </div>
        )
      })}
      <div className="action-buttons">
        <button className="action-button" disabled={!allSatisfied} onClick={confirm}>
          Confirm Temperance
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
