import { STRUCTURE_TYPES, TERRAIN_TYPES } from '../../../../engine/majorArcana/forcedOperand'
import type { OperandKind } from '../../../../engine/types/tarot'

const LEVELS = [1, 2, 3, 4, 5, 6]

export function OperandPicker({
  kind,
  value,
  onChange,
}: {
  kind: OperandKind
  value: string | number | ''
  onChange: (value: string | number) => void
}) {
  if (kind === 'terrain') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">choose a terrain…</option>
        {TERRAIN_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    )
  }
  if (kind === 'structureType') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">choose a structure type…</option>
        {STRUCTURE_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    )
  }
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      <option value="">choose a level…</option>
      {LEVELS.map((l) => (
        <option key={l} value={l}>
          Level {l}
        </option>
      ))}
    </select>
  )
}

export function operandKindLabel(kind: OperandKind): string {
  return kind === 'terrain' ? 'terrain' : kind === 'structureType' ? 'structure type' : 'VP level'
}
