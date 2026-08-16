#!/usr/bin/env node
// Build-time asset pipeline (issue #4): resizes full-resolution source art in src-assets/img/
// down to what the UI actually ever renders, writing the result to public/img/ (gitignored —
// a build artifact, not committed). Runs automatically via the `predev`/`prebuild` npm
// lifecycle hooks, so `npm run dev` and `npm run build` both regenerate it as needed.
//
// Per-directory max render size below is (largest CSS box that asset class ever renders at,
// across every component/breakpoint that uses it) x 3 (a DPI ceiling for retina/high-DPI
// displays), rounded up — see issue #4 for the full survey this is based on. Resizing only
// ever shrinks (withoutEnlargement), so a source already smaller than the ceiling passes
// through unchanged in dimensions but still gets recompressed.
//
// cards/logic_labels.png and cards/effect_labels.png are sprite sheets whose label positions
// are hardcoded as pixel bands in src/ui/cardArt.ts (LOGIC_BANDS/EFFECT_BANDS) against the
// sheet's exact natural dimensions — resizing them shifts every band. This script resizes them
// like anything else, but see scripts/scan-label-bands.mjs for recomputing the bands afterward;
// that step is NOT part of this pipeline (it's a one-time manual step after re-exporting art,
// not something that needs to run on every build).

import { readdir, mkdir, stat } from 'node:fs/promises'
import { join, relative, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC_DIR = join(ROOT, 'src-assets', 'img')
const OUT_DIR = join(ROOT, 'public', 'img')

// Ordered by specificity — first match wins. `fit` is a bounding box (aspect preserved);
// resize targets the longer implied dimension via sharp's `inside` fit.
const RULES = [
  { test: (p) => p.startsWith('tarot/'), maxDim: 600, quality: 85 },
  { test: (p) => p.startsWith('structures/'), maxDim: 400, quality: undefined },
  { test: (p) => p.startsWith('terrain/'), maxDim: 700, quality: 85 },
  { test: (p) => p === 'logician.png', maxDim: 200, quality: undefined },
  { test: (p) => p === 'menu-open.png' || p === 'menu-close.png', maxDim: 150, quality: undefined },
  { test: (p) => p === 'title-card.jpg', maxDim: 1920, quality: 85 },
  // Card frames, sprite sheets, and operator/effect art all render at CARD_WIDTH=90px max —
  // see src/ui/components/Hand/GameCard.tsx.
  { test: (p) => p.startsWith('cards/'), maxDim: 300, quality: undefined },
]

function ruleFor(relPath) {
  const rule = RULES.find((r) => r.test(relPath))
  if (!rule) throw new Error(`No resize rule matches ${relPath} — add one to RULES in scripts/resize-assets.mjs`)
  return rule
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else yield full
  }
}

async function isUpToDate(srcPath, outPath) {
  try {
    const [srcStat, outStat] = await Promise.all([stat(srcPath), stat(outPath)])
    return outStat.mtimeMs >= srcStat.mtimeMs
  } catch {
    return false
  }
}

async function main() {
  let processed = 0
  let skipped = 0
  let srcBytes = 0
  let outBytes = 0

  for await (const srcPath of walk(SRC_DIR)) {
    const relPath = relative(SRC_DIR, srcPath).split('\\').join('/')
    const outPath = join(OUT_DIR, relPath)
    const srcSize = (await stat(srcPath)).size
    srcBytes += srcSize

    if (await isUpToDate(srcPath, outPath)) {
      skipped += 1
      outBytes += (await stat(outPath)).size
      continue
    }

    const rule = ruleFor(relPath)
    await mkdir(dirname(outPath), { recursive: true })

    let pipeline = sharp(srcPath).resize({ width: rule.maxDim, height: rule.maxDim, fit: 'inside', withoutEnlargement: true })
    const ext = extname(relPath).toLowerCase()
    if (ext === '.jpg' || ext === '.jpeg') pipeline = pipeline.jpeg({ quality: rule.quality ?? 85 })
    else if (ext === '.png') pipeline = pipeline.png({ quality: rule.quality, compressionLevel: 9 })

    await pipeline.toFile(outPath)
    processed += 1
    outBytes += (await stat(outPath)).size
  }

  const pct = srcBytes ? (100 * (1 - outBytes / srcBytes)).toFixed(1) : '0'
  console.log(
    `resize-assets: ${processed} resized, ${skipped} up-to-date, ` +
      `${(srcBytes / 1e6).toFixed(1)}MB -> ${(outBytes / 1e6).toFixed(1)}MB (-${pct}%)`,
  )
}

main().catch((err) => {
  console.error('resize-assets failed:', err)
  process.exit(1)
})
