import { useState } from 'react'
import type { Operand, OperandKind } from '../../../../engine/types/tarot'
import { OperandPicker } from './OperandPicker'

const KINDS: OperandKind[] = ['terrain', 'structureType', 'level']
const KIND_LABELS: Record<OperandKind, string> = { terrain: 'Terrain', structureType: 'Structure Type', level: 'VP Level' }

export function ConditionPicker({ operand, onChange }: { operand: Operand | null; onChange: (next: Operand | null) => void }) {
  // Tracks the category even before a value has been chosen (at which point `operand` is still null).
  const [pendingKind, setPendingKind] = useState<OperandKind | ''>(operand?.kind ?? '')
  const kind = operand?.kind ?? pendingKind

  return (
    <span className="redistribute-row">
      <select
        value={kind}
        onChange={(e) => {
          const nextKind = e.target.value as OperandKind | ''
          setPendingKind(nextKind)
          onChange(null)
        }}
      >
        <option value="">category…</option>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_LABELS[k]}
          </option>
        ))}
      </select>
      {kind && (
        <OperandPicker
          kind={kind}
          value={operand?.value ?? ''}
          onChange={(value) => onChange({ kind, value } as Operand)}
        />
      )}
    </span>
  )
}
