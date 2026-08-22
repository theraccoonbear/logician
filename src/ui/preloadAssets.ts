import { assetUrl } from './assetUrl'

export interface PreloadProgress {
  loaded: number
  total: number
}

function collectAssetUrls(): string[] {
  const urls: string[] = []

  // Terrain (4)
  for (const t of ['prairies', 'forests', 'mountains', 'swamps']) {
    urls.push(assetUrl(`/img/terrain/${t}.png`))
  }

  // Structures — pool 2-3, pyramid 1-4, tower 1-6
  for (const [type, levels] of [['pool', [2, 3]], ['pyramid', [1, 2, 3, 4]], ['tower', [1, 2, 3, 4, 5, 6]]] as const) {
    for (const lv of levels) {
      urls.push(assetUrl(`/img/structures/${type}-${lv}.png`))
    }
  }

  // Fortress — back + fore for levels 1-2
  for (const lv of [1, 2]) {
    urls.push(assetUrl(`/img/structures/fortress--back-${lv}.png`))
    urls.push(assetUrl(`/img/structures/fortress--fore-${lv}.png`))
  }

  // Card sprite sheets + frames
  urls.push(assetUrl('/img/cards/logic_labels.png'))
  urls.push(assetUrl('/img/cards/effect_labels.png'))
  urls.push(assetUrl('/img/cards/logic.png'))
  urls.push(assetUrl('/img/cards/effect.png'))

  // Operator art
  for (const op of ['ALPHA', 'BETA', 'NOT', 'AND', 'OR', 'NOR', 'XOR']) {
    urls.push(assetUrl(`/img/cards/${op}_operator.png`))
  }

  // Effect art
  for (const ef of ['upgrade_1', 'upgrade_2', 'upgrade_3', 'downgrade_1', 'downgrade_2', 'downgrade_3', 'maximize', 'randomize', 'combo']) {
    urls.push(assetUrl(`/img/cards/effect_${ef}.png`))
  }

  // Tarot — 22 major arcana
  for (const id of [
    'fool', 'magician', 'high_priestess', 'empress', 'emperor',
    'hierophant', 'lovers', 'chariot', 'strength', 'hermit',
    'wheel', 'justice', 'hanged_man', 'death', 'temperance',
    'devil', 'tower', 'moon', 'sun', 'judgement', 'world',
  ]) {
    urls.push(assetUrl(`/img/tarot/${id}.jpeg`))
  }

  // Tarot — 56 minor arcana (4 suits × 14 ranks)
  const suits = ['swords', 'wands', 'cups', 'pentacles']
  const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'page', 'knight', 'queen', 'king']
  for (const suit of suits) {
    for (const rank of ranks) {
      urls.push(assetUrl(`/img/tarot/${suit}-${rank}.jpeg`))
    }
  }

  // UI chrome
  urls.push(assetUrl('/img/logician.png'))
  urls.push(assetUrl('/img/title-card.jpg'))
  urls.push(assetUrl('/img/menu-open.png'))
  urls.push(assetUrl('/img/menu-close.png'))

  return urls
}

function loadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => {
      console.warn(`[preload] failed to load: ${url}`)
      resolve()
    }
    img.src = url
  })
}

type Listener = (p: PreloadProgress) => void

let loaded = 0
let total = 0
let promise: Promise<PreloadProgress> | null = null
const listeners = new Set<Listener>()

function notify() {
  const snapshot: PreloadProgress = { loaded, total }
  for (const fn of listeners) fn(snapshot)
}

function startPreload() {
  const urls = collectAssetUrls()
  total = urls.length
  loaded = 0
  notify() // snapshot { 0, total } so late subscribers see the real total immediately

  promise = (async () => {
    const BATCH = 12
    for (let i = 0; i < urls.length; i += BATCH) {
      const batch = urls.slice(i, i + BATCH)
      await Promise.all(
        batch.map((u) =>
          loadImage(u).then(() => {
            loaded++
            notify()
          }),
        ),
      )
    }
    return { loaded, total }
  })()

  return promise
}

/**
 * Kick off (or reuse) the asset preload.
 * Returns a snapshot `{ loaded, total }` at call time and a `subscribe` function
 * the caller can use to receive live progress updates — including retroactive ones
 * if loading already finished before the first subscribe call.
 */
export function preloadAssets(): { progress: PreloadProgress; subscribe: (fn: Listener) => () => void; promise: Promise<PreloadProgress> } {
  if (!promise) startPreload()

  return {
    progress: { loaded, total },
    subscribe(fn: Listener) {
      listeners.add(fn)
      // Immediately emit current state so the subscriber never sees stale 0/0
      fn({ loaded, total })
      return () => { listeners.delete(fn) }
    },
    promise: promise!,
  }
}
