import { useEffect } from 'react'
import { useGameEngine } from '../../../hooks/useGameEngine'

export function DevilForm({
  onConfirm,
  onCancel,
  onPreviewTargetsChange,
}: {
  onConfirm: (params: unknown) => void
  onCancel: () => void
  onPreviewTargetsChange?: (ids: Set<string>) => void
}) {
  const { state } = useGameEngine()

  useEffect(() => {
    onPreviewTargetsChange?.(new Set())
    return () => { onPreviewTargetsChange?.(new Set()) }
  }, [onPreviewTargetsChange])

  if (!state) return null

  return (
    <div className="major-arcana-form">
      <p>Your opponent will name 2 conditions (terrain, structure type, or level). Using your chosen Logic card and those conditions, all matching structures are destroyed. No Effect card.</p>
      <div className="action-buttons">
        <button className="action-button" onClick={() => onConfirm({})}>
          Play The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
