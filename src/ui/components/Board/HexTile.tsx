import type { Hex } from '../../../engine/board'
import type { Structure, StructureType } from '../../../engine/types/structure'
import { StructureToken } from './StructureToken'

const TERRAIN_CLASS: Record<Hex['terrain'], string> = {
  Prairies: 'terrain-prairies',
  Forests: 'terrain-forests',
  Mountains: 'terrain-mountains',
  Swamps: 'terrain-swamps',
}

// Fixed left-to-right spot per structure type, rather than grouping by owner —
// so a Pool is always in the same place on every hex regardless of whose it is
// or what else is built there. Each spot can stack more than one token when
// multiple players have that type on the same hex. Tower sits in the middle
// (not the end) and renders taller, pulled up behind the row — see
// .hex-type-slot-tower in App.css — so it reads as the tallest piece on the
// hex rather than just another same-size icon in a line.
const TYPE_SLOTS: readonly StructureType[] = ['Pool', 'Tower', 'Pyramid', 'Fortress']

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
    // The selection ring below has to render OUTSIDE .hex-tile, not inside it: clip-path on
    // .hex-tile clips its entire subtree's paint to the hex silhouette, so no descendant —
    // pseudo-element, filter:drop-shadow, anything — can ever visually extend past that same
    // boundary, no matter how it's positioned or sized. This wrapper is the true (unclipped)
    // sibling context the ring needs; see .hex-tile-ring in App.css.
    <div className={`hex-slot ${selected ? 'is-selected' : ''}`}>
      {selected && <div className="hex-tile-ring" />}
      <div
        className="hex-tile"
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
        aria-label={`${hex.id}, ${hex.terrain}, ${structures.length} structure(s)`}
      >
        <div className={`hex-terrain-art ${TERRAIN_CLASS[hex.terrain]}`} />
        <div className="hex-terrain-label">{hex.terrain}</div>
        <div className={`hex-structures ${owners.length > 1 ? 'is-crowded' : ''}`}>
          {owners.map((owner) => {
            const ownerStructures = structures.filter((s) => s.owner === owner)
            return (
              <div className="hex-owner-band" key={owner}>
                {TYPE_SLOTS.filter((type) => ownerStructures.some((s) => s.type === type)).map((type) => (
                  <div className={`hex-type-slot hex-type-slot-${type.toLowerCase()}`} key={type}>
                    {ownerStructures
                      .filter((s) => s.type === type)
                      .map((s) => (
                        <StructureToken
                          key={s.id}
                          structure={s}
                          color={colorOf(s.owner)}
                          highlighted={highlightedIds.has(s.id) || Boolean(selectedStructureIds?.has(s.id))}
                          crowded={owners.length > 1}
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
