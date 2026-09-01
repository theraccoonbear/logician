import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'

export function TowerForm({
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const [ownId, setOwnId] = useState<string | null>(null)
  const [opponentIds, setOpponentIds] = useState<Set<string>>(new Set())

  // The candidate set — own structure plus whatever opponent structures are checked so far —
  // previews as soon as anything's picked, even before the running total legally matches X.
  const candidateIds = new Set(opponentIds)
  if (ownId) candidateIds.add(ownId)
  useTargetPreview(candidateIds, onPreviewTargetsChange)

  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const myTargets = state.structures.filter((s) => s.owner === player.id && !s.fortressed)
  const own = state.structures.find((s) => s.id === ownId)
  const opponentTargets = state.structures.filter((s) => s.owner !== player.id && !s.fortressed)
  const total = [...opponentIds].reduce((sum, id) => sum + (state.structures.find((s) => s.id === id)?.level ?? 0), 0)

  const toggle = (id: string) => {
    const next = new Set(opponentIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpponentIds(next)
  }

  const canConfirm = own && opponentIds.size > 0 && total === own.level

  return (
    <div className="major-arcana-form">
      <p>Sacrifice one of your own structures (level X); destroy opponent structures totaling exactly X.</p>
      <div className="redistribute-row">
        <span>Your structure to sacrifice:</span>
        <select value={ownId ?? ''} onChange={(e) => setOwnId(e.target.value || null)}>
          <option value="">choose…</option>
          {myTargets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.type} Lv.{s.level} on {s.hexId}
            </option>
          ))}
        </select>
      </div>
      <p>
        Opponent structures to destroy (must total {own ? own.level : 'X'}, currently {total}):
      </p>
      <div className="deck-search-list">
        {opponentTargets.map((s) => {
          const owner = state.players.find((p) => p.id === s.owner)
          return (
            <label key={s.id}>
              <input type="checkbox" checked={opponentIds.has(s.id)} onChange={() => toggle(s.id)} />
              {s.type} Lv.{s.level} on {s.hexId} (owner {owner?.name})
            </label>
          )
        })}
      </div>
      <div className="action-buttons">
        <button className="action-button" disabled={!canConfirm} onClick={() => onConfirm({ ownStructureId: ownId, opponentStructureIds: [...opponentIds] })}>
          Confirm The Tower
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
