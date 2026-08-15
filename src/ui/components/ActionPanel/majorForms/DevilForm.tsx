import { useState } from 'react'
import { getAffectedStructures } from '../../../../engine/selectors'
import type { Operand } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { ConditionPicker } from './ConditionPicker'

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
  const [condition1, setCondition1] = useState<Operand | null>(null)
  const [condition2, setCondition2] = useState<Operand | null>(null)
  const [logicId, setLogicId] = useState<string | null>(null)

  const differentCategories = Boolean(condition1 && condition2 && condition1.kind !== condition2.kind)
  const logicCard = state?.players[state.activePlayerIndex].logicHand.find((c) => c.instanceId === logicId)
  const previewIds =
    state && condition1 && condition2 && differentCategories && logicCard
      ? new Set(getAffectedStructures(state, { logicCardId: logicCard.kind, operandA: condition1, operandB: condition2 }).map((s) => s.id))
      : new Set<string>()
  useTargetPreview(previewIds, onPreviewTargetsChange)

  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const canConfirm = Boolean(condition1 && condition2 && differentCategories && logicId)

  return (
    <div className="major-arcana-form">
      <p>Two opponents each name a different condition (in a 2-player game, the same opponent names both). No Effect card — the result is always destroy.</p>
      <p>Condition 1:</p>
      <ConditionPicker operand={condition1} onChange={setCondition1} />
      <p>Condition 2 (must be a different category):</p>
      <ConditionPicker operand={condition2} onChange={setCondition2} />
      <LogicCardHand cards={player.logicHand} selectedId={logicId} onSelect={setLogicId} />
      <div className="action-buttons">
        <button className="action-button" disabled={!canConfirm} onClick={() => onConfirm({ condition1, condition2, logicCardId: logicId })}>
          Confirm The Devil
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
