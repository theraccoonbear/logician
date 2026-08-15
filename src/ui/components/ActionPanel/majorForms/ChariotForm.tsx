import { useState } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'

export function ChariotForm({
  selectedHexId,
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  selectedHexId: string | null
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()
  const onHex = selectedHexId && state ? state.structures.filter((s) => s.hexId === selectedHexId) : []
  const originalTotal = onHex.reduce((sum, s) => sum + s.level, 0)
  const [levels, setLevels] = useState<Record<string, number>>(() => Object.fromEntries(onHex.map((s) => [s.id, s.level])))
  // Every structure on the chosen hex is the target — trivially previewable the instant a
  // hex is selected, no further choices needed.
  useTargetPreview(new Set(onHex.map((s) => s.id)), onPreviewTargetsChange)

  if (!selectedHexId) {
    return (
      <div className="major-arcana-form">
        <p>Select an unfortified hex on the board to redistribute its structures' levels.</p>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    )
  }

  const currentTotal = Object.values(levels).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0)
  const balanced = currentTotal === originalTotal

  return (
    <div className="major-arcana-form">
      <p>
        Redistribute levels on {selectedHexId} (total must stay {originalTotal}).
      </p>
      {onHex.map((s) => (
        <div className="redistribute-row" key={s.id}>
          <span>
            {s.type} (owner {s.owner})
          </span>
          <input
            type="number"
            value={levels[s.id] ?? s.level}
            onChange={(e) => setLevels({ ...levels, [s.id]: Number(e.target.value) })}
          />
        </div>
      ))}
      <p>
        Total: {currentTotal} / {originalTotal}
      </p>
      <div className="action-buttons">
        <button className="action-button" disabled={!balanced} onClick={() => onConfirm({ hexId: selectedHexId, newLevels: levels })}>
          Confirm The Chariot
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
