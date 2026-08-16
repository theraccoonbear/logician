import type { CSSProperties } from 'react'
import type { EffectCardId, LogicCardId } from '../engine/types/cards'
import { assetUrl } from './assetUrl'

// Label sheets (logic_labels.png, effect_labels.png) are sprite sheets — one label stacked
// per row, at varying heights (short labels like "A" render in a much bigger font than long
// ones like "A NOT B"). Rather than pre-cropping each label into its own file, every card
// reads a window into the same sheet via CSS background-position — see labelStyle().
// Band Y-ranges below are raw pixel coordinates in the SHIPPED sheet (public/img/cards/, the
// resize-assets.mjs output — see scripts/scan-label-bands.py), found by scanning for
// contiguous rows of non-transparent pixels. Re-scan and update these — via
// `python3 scripts/scan-label-bands.py public/img/cards/logic_labels.png` (after
// `npm run dev`/`build` has generated it) — if either sheet is ever re-exported at a different
// size in src-assets/img/, OR if the `cards/` resize rule in scripts/resize-assets.mjs ever
// changes: the coordinates are tied to the exact shipped pixels, not proportional to sheet
// size, so either kind of change shifts every band.

interface Sheet {
  url: string
  naturalWidth: number
  naturalHeight: number
}

const LOGIC_SHEET: Sheet = { url: assetUrl('/img/cards/logic_labels.png'), naturalWidth: 170, naturalHeight: 300 }
const LOGIC_BANDS: Record<LogicCardId, [number, number]> = {
  A: [6, 32],
  B: [37, 62],
  NOT_A: [66, 92],
  NOT_B: [95, 121],
  A_AND_B: [125, 150],
  A_OR_B: [154, 179],
  A_NOT_B: [183, 208],
  B_NOT_A: [212, 238],
  A_NOR_B: [242, 267],
  A_XOR_B: [271, 297],
}

const EFFECT_SHEET: Sheet = { url: assetUrl('/img/cards/effect_labels.png'), naturalWidth: 194, naturalHeight: 300 }
const EFFECT_BANDS: Record<EffectCardId, [number, number]> = {
  UPGRADE_1: [3, 34],
  UPGRADE_2: [36, 67],
  UPGRADE_3: [70, 100],
  DOWNGRADE_1: [103, 134],
  DOWNGRADE_2: [136, 167],
  DOWNGRADE_3: [169, 199],
  MAXIMIZE: [202, 226],
  RANDOMIZE: [234, 260],
  COMBO: [267, 292],
}

export const LOGIC_FRAME = assetUrl('/img/cards/logic.png')
export const EFFECT_FRAME = assetUrl('/img/cards/effect.png')

// Dedicated operator art (public/img/cards/{OP}_operator.png) for the card's center panel.
// A/B aren't operators, but get their own "Alpha"/"Beta" art rather than staying empty.
// A_NOT_B/B_NOT_A reuse the NOT art too — both are NOT-based (A AND NOT B / B AND NOT A),
// same reasoning as NOT_A/NOT_B.
const LOGIC_OPERATOR_ART: Partial<Record<LogicCardId, string>> = {
  A: assetUrl('/img/cards/ALPHA_operator.png'),
  B: assetUrl('/img/cards/BETA_operator.png'),
  NOT_A: assetUrl('/img/cards/NOT_operator.png'),
  NOT_B: assetUrl('/img/cards/NOT_operator.png'),
  A_AND_B: assetUrl('/img/cards/AND_operator.png'),
  A_OR_B: assetUrl('/img/cards/OR_operator.png'),
  A_NOT_B: assetUrl('/img/cards/NOT_operator.png'),
  B_NOT_A: assetUrl('/img/cards/NOT_operator.png'),
  A_NOR_B: assetUrl('/img/cards/NOR_operator.png'),
  A_XOR_B: assetUrl('/img/cards/XOR_operator.png'),
}

// Dedicated effect art (public/img/cards/effect_{kind}.png) for the card's center panel —
// every EffectCardId now has one. Still a Partial map (rather than Record) so a future new
// kind without art yet falls back to caption-only instead of a missing-key type error.
const EFFECT_ART: Partial<Record<EffectCardId, string>> = {
  UPGRADE_1: assetUrl('/img/cards/effect_upgrade_1.png'),
  UPGRADE_2: assetUrl('/img/cards/effect_upgrade_2.png'),
  UPGRADE_3: assetUrl('/img/cards/effect_upgrade_3.png'),
  DOWNGRADE_1: assetUrl('/img/cards/effect_downgrade_1.png'),
  DOWNGRADE_2: assetUrl('/img/cards/effect_downgrade_2.png'),
  DOWNGRADE_3: assetUrl('/img/cards/effect_downgrade_3.png'),
  MAXIMIZE: assetUrl('/img/cards/effect_maximize.png'),
  RANDOMIZE: assetUrl('/img/cards/effect_randomize.png'),
  COMBO: assetUrl('/img/cards/effect_combo.png'),
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

// The card's big empty center panel — where the operator/effect art above goes, when a kind
// has any. Effect's black panel runs closer to the frame's edges than Logic's (which has its
// own inset square sub-frame), hence the different box.
const LOGIC_ART_BOX: Box = { left: 0.207, top: 0.205, width: 0.6, height: 0.44 }
const EFFECT_ART_BOX: Box = { left: 0.12, top: 0.17, width: 0.76, height: 0.48 }

// Bottom third of the card, where the brass/gold nameplate is on both frames — the actual
// caption for every card, logic or effect.
const LOGIC_CAPTION_BOX: Box = { left: 0.12, top: 0.65, width: 0.76, height: 0.28 }
const EFFECT_CAPTION_BOX: Box = { left: 0.08, top: 0.72, width: 0.84, height: 0.22 }

// Shared by logicArtStyle/effectArtStyle — centers a piece of center-panel art inside a box
// on the card, scaled to fit without cropping.
function iconStyle(url: string, box: Box, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return {
    position: 'absolute',
    left: cardWidthPx * box.left,
    top: cardHeightPx * box.top,
    width: cardWidthPx * box.width,
    height: cardHeightPx * box.height,
    backgroundImage: `url(${url})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
  }
}

function labelStyle(sheet: Sheet, band: [number, number], box: Box, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  const [top, bottom] = band
  const boxWidthPx = cardWidthPx * box.width
  const scale = boxWidthPx / sheet.naturalWidth
  const labelHeightPx = (bottom - top) * scale

  return {
    position: 'absolute',
    left: cardWidthPx * box.left,
    top: cardHeightPx * box.top + (cardHeightPx * box.height - labelHeightPx) / 2,
    width: boxWidthPx,
    height: labelHeightPx,
    backgroundImage: `url(${sheet.url})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${boxWidthPx}px auto`,
    backgroundPosition: `0px ${-top * scale}px`,
  }
}

export function logicArtStyle(kind: LogicCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties | undefined {
  const url = LOGIC_OPERATOR_ART[kind]
  return url ? iconStyle(url, LOGIC_ART_BOX, cardWidthPx, cardHeightPx) : undefined
}

export function effectArtStyle(kind: EffectCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties | undefined {
  const url = EFFECT_ART[kind]
  return url ? iconStyle(url, EFFECT_ART_BOX, cardWidthPx, cardHeightPx) : undefined
}

export function logicCaptionStyle(kind: LogicCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return labelStyle(LOGIC_SHEET, LOGIC_BANDS[kind], LOGIC_CAPTION_BOX, cardWidthPx, cardHeightPx)
}

export function effectCaptionStyle(kind: EffectCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return labelStyle(EFFECT_SHEET, EFFECT_BANDS[kind], EFFECT_CAPTION_BOX, cardWidthPx, cardHeightPx)
}
