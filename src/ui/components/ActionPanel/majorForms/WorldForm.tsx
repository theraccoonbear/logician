import { useState } from 'react'
import { getAffectedStructures } from '../../../../engine/selectors'
import { LOGIC_CARD_IDS, type LogicCardId } from '../../../../engine/types/cards'
import type { Operand } from '../../../../engine/types/tarot'
import { LOGIC_CARD_LABELS } from '../../../cardLabels'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { useTargetPreview } from '../../../hooks/useTargetPreview'
import { ConditionPicker } from './ConditionPicker'

export function WorldForm({
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
  const [logicKind, setLogicKind] = useState<LogicCardId | ''>('')

  const differentCategories = Boolean(condition1 && condition2 && condition1.kind !== condition2.kind)
  const canConfirm = Boolean(condition1 && condition2 && differentCategories && logicKind)
  const previewIds =
    state && condition1 && condition2 && differentCategories && logicKind
      ? new Set(getAffectedStructures(state, { logicCardId: logicKind, operandA: condition1, operandB: condition2 }).map((s) => s.id))
      : new Set<string>()
  useTargetPreview(previewIds, onPreviewTargetsChange)

  return (
    <div className="major-arcana-form">
      <p>No Logic/Effect card is played. Name two different-category conditions and a Logic rule. The effect is always Upgrade 1.</p>
      <p>Condition 1:</p>
      <ConditionPicker operand={condition1} onChange={setCondition1} />
      <p>Condition 2 (must be a different category):</p>
      <ConditionPicker operand={condition2} onChange={setCondition2} />
      <div className="redistribute-row">
        <span>Logic rule:</span>
        <select value={logicKind} onChange={(e) => setLogicKind(e.target.value as LogicCardId)}>
          <option value="">choose…</option>
          {LOGIC_CARD_IDS.map((id) => (
            <option key={id} value={id}>
              {LOGIC_CARD_LABELS[id]}
            </option>
          ))}
        </select>
      </div>
      <div className="action-buttons">
        <button className="action-button" disabled={!canConfirm} onClick={() => onConfirm({ condition1, condition2, logicKind })}>
          Confirm The World
        </button>
        <button className="action-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
