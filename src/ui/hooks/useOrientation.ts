import { useEffect, useState } from 'react'

export type Orientation = 'landscape' | 'portrait'

function readOrientation(): Orientation {
  if (typeof window === 'undefined' || !window.matchMedia) return 'landscape'
  return window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait'
}

/** Tracks viewport orientation (width > height = landscape), live — device rotation, browser
 *  resize, or a narrow/tall vs. wide/short window all flip it. */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(readOrientation)

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const update = () => setOrientation(mql.matches ? 'landscape' : 'portrait')
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return orientation
}
