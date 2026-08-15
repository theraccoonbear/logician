import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'

export function StrengthForm({
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

  const own = state?.structures.find((s) => s.id === ownId)
  const affectedOpponents = own
    ? state!.structures.filter((s) => s.owner !== own.owner && s.type === own.type && !s.fortressed)
    : []
  useTargetPreview(own ? new Set([own.id, ...affectedOpponents.map((s) => s.id)]) : new Set(), onPreviewTargetsChange)

  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const myTargets = state.structures.filter((s) => s.owner === player.id && !s.fortressed)
  const affectedOpponentCount = affectedOpponents.length

  return (
    <div className="major-arcana-form">
      <p>Downgrade 1 on one of your own structures; downgrade 1 on every unfortified opponent structure of that same type.</p>
      <div className="redistribute-row">
        <span>Your structure:</span>
        <select value={ownId ?? ''} onChange={(e) => setOwnId(e.target.value || null)}>
          <option value="">choose…</option>
          {myTargets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.type} Lv.{s.level} on {s.hexId}
            </option>
          ))}
        </select>
      </div>
      {own && <p>This will also downgrade {affectedOpponentCount} unfortified opponent {own.type}(s).</p>}
      <div className="action-buttons">
        <button className="action-button" disabled={!own} onClick={() => onConfirm({ ownStructureId: ownId })}>
          Confirm Strength
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
