import type { CSSProperties, MouseEvent } from 'react'
import type { Structure } from '../../../engine/types/structure'
import { structureArtUrl } from '../../structureArt'

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
  crowded,
  onClick,
}: {
  structure: Structure
  color: string
  highlighted: boolean
  /** More than one player has this hex — render at the smaller "shared" footprint. */
  crowded?: boolean
  onClick?: (e: MouseEvent) => void
}) {
  const title = `${structure.type} — level ${structure.level}`
  const artUrl = structureArtUrl(structure)

  // Art tokens (currently Pool/Pyramid/Tower) render the real illustration at a
  // standard footprint (object-fit: contain inside a fixed box — see .structure-art
  // in App.css) regardless of each source image's own aspect ratio, so a wide flat
  // Pool and a tall narrow Tower read as roughly the same size. Types without art
  // yet (Fortress) fall back to the original flat shape token.
  if (artUrl) {
    const classes = [
      'structure-token',
      'structure-token-art',
      crowded ? 'is-crowded' : '',
      structure.fortressed ? 'is-fortressed' : '',
      highlighted ? 'is-highlighted' : '',
      onClick ? 'is-clickable' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        className={classes}
        style={{ '--owner-color': color } as CSSProperties}
        title={title}
        onClick={onClick}
      >
        <img className="structure-art" src={artUrl} alt={title} />
        <span className="structure-level structure-level-badge">{structure.level}</span>
      </div>
    )
  }

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
    <div className={classes} style={{ borderColor: color }} title={title} onClick={onClick}>
      <span className="structure-level">{structure.level}</span>
    </div>
  )
}
