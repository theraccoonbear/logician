import { useState } from 'react'
import type { Operand, OperandKind } from '../../../../engine/types/tarot'
import { OperandPicker } from './OperandPicker'

const KINDS: OperandKind[] = ['terrain', 'structureType', 'level']
const KIND_LABELS: Record<OperandKind, string> = { terrain: 'Terrain', structureType: 'Structure Type', level: 'VP Level' }

export function ConditionPicker({ operand, onChange, excludedKinds }: { operand: Operand | null; onChange: (next: Operand | null) => void; excludedKinds?: Set<string> }) {
  // Tracks the category even before a value has been chosen (at which point `operand` is still null).
  const [pendingKind, setPendingKind] = useState<OperandKind | ''>(operand?.kind ?? '')
  const kind = operand?.kind ?? pendingKind
  const availableKinds = KINDS.filter((k) => !excludedKinds?.has(k))

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
        <option value="">category...</option>
        {availableKinds.map((k) => (
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
