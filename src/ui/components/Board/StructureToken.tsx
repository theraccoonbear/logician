import type { MouseEvent } from 'react'
import type { Structure } from '../../../engine/types/structure'

const SHAPE_CLASS: Record<Structure['type'], string> = {
  Pool: 'token-pool',
  Pyramid: 'token-pyramid',
  Tower: 'token-tower',
  Fortress: 'token-fortress',
}

export function StructureToken({
  structure,
  color,
  highlighted,
  onClick,
}: {
  structure: Structure
  color: string
  highlighted: boolean
  onClick?: (e: MouseEvent) => void
}) {
  const classes = [
    'structure-token',
    SHAPE_CLASS[structure.type],
    structure.fortressed ? 'is-fortressed' : '',
    highlighted ? 'is-highlighted' : '',
    onClick ? 'is-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      style={{ borderColor: color }}
      title={`${structure.type} — level ${structure.level}`}
      onClick={onClick}
    >
      <span className="structure-level">{structure.level}</span>
    </div>
  )
}
