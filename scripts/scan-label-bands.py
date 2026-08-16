#!/usr/bin/env python3
"""One-time dev utility, not part of the build pipeline: scans a label sprite sheet (PNG with
real alpha transparency) for contiguous vertical bands of non-transparent content, one per
label. Re-run this against cards/logic_labels.png / cards/effect_labels.png in public/img/
whenever that source art is re-exported (a re-export at different dimensions shifts every
band) — paste the printed [top, bottom] pairs into LOGIC_BANDS/EFFECT_BANDS in
src/ui/cardArt.ts, in sheet order top-to-bottom, matched against the LogicCardId/EffectCardId
order already documented there. Also update LOGIC_SHEET/EFFECT_SHEET's naturalWidth/naturalHeight
to the printed image size.

Usage: python3 scripts/scan-label-bands.py <path-to-sheet.png> [alpha-threshold]
"""

import sys
from PIL import Image


def main():
    path = sys.argv[1]
    threshold = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    im = Image.open(path).convert('RGBA')
    width, height = im.size
    alpha = im.getchannel('A')

    row_has_content = []
    for y in range(height):
        row = alpha.crop((0, y, width, y + 1))
        row_has_content.append(row.getextrema()[1] > threshold)

    bands = []
    start = None
    for y, has in enumerate(row_has_content):
        if has and start is None:
            start = y
        elif not has and start is not None:
            bands.append((start, y))
            start = None
    if start is not None:
        bands.append((start, height))

    print(f'{path}: {width}x{height}, {len(bands)} band(s) found')
    for top, bottom in bands:
        print(f'  [{top}, {bottom}]')


if __name__ == '__main__':
    main()
