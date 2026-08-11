import type { Hex } from '../../../engine/board'
import type { Structure } from '../../../engine/types/structure'
import { StructureToken } from './StructureToken'

const TERRAIN_CLASS: Record<Hex['terrain'], string> = {
  Prairies: 'terrain-prairies',
  Forests: 'terrain-forests',
  Mountains: 'terrain-mountains',
  Swamps: 'terrain-swamps',
}

export function HexTile({
  hex,
  structures,
  colorOf,
  highlightedIds,
  selectedStructureIds,
  selected,
  onClick,
  onStructureClick,
}: {
  hex: Hex
  structures: Structure[]
  colorOf: (ownerId: string) => string
  highlightedIds: Set<string>
  selectedStructureIds?: Set<string>
  selected: boolean
  onClick?: () => void
  onStructureClick?: (structure: Structure) => void
}) {
  const owners = Array.from(new Set(structures.map((s) => s.owner)))

  return (
    <div
      className={`hex-tile ${TERRAIN_CLASS[hex.terrain]} ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      aria-label={`${hex.id}, ${hex.terrain}, ${structures.length} structure(s)`}
    >
      <div className="hex-terrain-label">{hex.terrain}</div>
      <div className="hex-structures">
        {owners.map((owner) => (
          <div className="hex-owner-stack" key={owner}>
            {structures
              .filter((s) => s.owner === owner)
              .map((s) => (
                <StructureToken
                  key={s.id}
                  structure={s}
                  color={colorOf(owner)}
                  highlighted={highlightedIds.has(s.id) || Boolean(selectedStructureIds?.has(s.id))}
                  onClick={
                    onStructureClick
                      ? (e) => {
                          e.stopPropagation()
                          onStructureClick(s)
                        }
                      : undefined
                  }
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}
