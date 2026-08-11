import { useState } from 'react'
import type { Operand } from '../../../../engine/types/tarot'
import { useGameEngine } from '../../../hooks/useGameEngine'
import { LogicCardHand } from '../../Hand/LogicCardHand'
import { ConditionPicker } from './ConditionPicker'

export function DevilForm({ onConfirm, onCancel }: { onConfirm: (params: unknown) => void; onCancel: () => void }) {
  const { state } = useGameEngine()
  const [condition1, setCondition1] = useState<Operand | null>(null)
  const [condition2, setCondition2] = useState<Operand | null>(null)
  const [logicId, setLogicId] = useState<string | null>(null)
  if (!state) return null

  const player = state.players[state.activePlayerIndex]
  const differentCategories = condition1 && condition2 && condition1.kind !== condition2.kind
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
