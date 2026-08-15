import type { CSSProperties } from 'react'
import type { EffectCardId, LogicCardId } from '../engine/types/cards'
import { assetUrl } from './assetUrl'

// Label sheets (logic_labels.jpg, effect_labels.png) are sprite sheets — one label stacked
// per row, at varying heights (short labels like "A" render in a much bigger font than long
// ones like "A NOT B"). Rather than pre-cropping each label into its own file, every card
// reads a window into the same sheet via CSS background-position — see labelStyle().
// Band Y-ranges below are raw pixel coordinates in the SOURCE sheet, found by scanning for
// contiguous rows of non-background pixels (content in the .jpg = brightness above a
// threshold, since it has no alpha channel; content in the .png = alpha above a threshold).

interface Sheet {
  url: string
  naturalWidth: number
  naturalHeight: number
}

const LOGIC_SHEET: Sheet = { url: assetUrl('/img/cards/logic_labels.jpg'), naturalWidth: 727, naturalHeight: 1371 }
const LOGIC_BANDS: Record<LogicCardId, [number, number]> = {
  A: [62, 168],
  B: [194, 297],
  NOT_A: [322, 427],
  NOT_B: [450, 555],
  A_AND_B: [579, 682],
  A_OR_B: [705, 810],
  A_NOT_B: [833, 937],
  B_NOT_A: [960, 1066],
  A_NOR_B: [1089, 1194],
  A_XOR_B: [1217, 1323],
}

const EFFECT_SHEET: Sheet = { url: assetUrl('/img/cards/effect_labels.png'), naturalWidth: 868, naturalHeight: 1343 }
const EFFECT_BANDS: Record<EffectCardId, [number, number]> = {
  UPGRADE_1: [16, 151],
  UPGRADE_2: [165, 299],
  UPGRADE_3: [314, 447],
  DOWNGRADE_1: [463, 596],
  DOWNGRADE_2: [611, 743],
  DOWNGRADE_3: [758, 890],
  MAXIMIZE: [905, 1011],
  RANDOMIZE: [1051, 1160],
  COMBO: [1198, 1306],
}

export const LOGIC_FRAME = assetUrl('/img/cards/logic.png')
export const EFFECT_FRAME = assetUrl('/img/cards/effect.png')

interface Box {
  left: number
  top: number
  width: number
  height: number
}

// The card's big empty center panel — used on Logic cards to show the operator label large,
// as if it were the card's artwork (Effect cards don't get this treatment, just the caption).
const LOGIC_ART_BOX: Box = { left: 0.207, top: 0.205, width: 0.6, height: 0.44 }

// Bottom third of the card, where the brass/gold nameplate is on both frames — the actual
// caption for every card, logic or effect.
const LOGIC_CAPTION_BOX: Box = { left: 0.12, top: 0.65, width: 0.76, height: 0.28 }
const EFFECT_CAPTION_BOX: Box = { left: 0.08, top: 0.72, width: 0.84, height: 0.22 }

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

export function logicArtStyle(kind: LogicCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return labelStyle(LOGIC_SHEET, LOGIC_BANDS[kind], LOGIC_ART_BOX, cardWidthPx, cardHeightPx)
}

export function logicCaptionStyle(kind: LogicCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return labelStyle(LOGIC_SHEET, LOGIC_BANDS[kind], LOGIC_CAPTION_BOX, cardWidthPx, cardHeightPx)
}

export function effectCaptionStyle(kind: EffectCardId, cardWidthPx: number, cardHeightPx: number): CSSProperties {
  return labelStyle(EFFECT_SHEET, EFFECT_BANDS[kind], EFFECT_CAPTION_BOX, cardWidthPx, cardHeightPx)
}
