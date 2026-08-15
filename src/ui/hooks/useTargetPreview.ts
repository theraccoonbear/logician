import { useEffect, useRef } from 'react'

/**
 * Reports a computed target-id set up to a parent callback whenever the set of ids actually
 * changes — not on every render. Most callers derive `ids` from an unmemoized `.filter()`, so
 * it's a fresh Set object every render even when its contents are identical; comparing by
 * content (not reference) here, with no dependency array (runs after every render but
 * self-guards via a cached content key), is what keeps a parent that stores the reported set
 * in its own state from re-rendering — and re-triggering this effect — every single render.
 */
export function useTargetPreview(ids: Set<string>, onChange?: (ids: Set<string>) => void) {
  const lastKeyRef = useRef<string>('')
  useEffect(() => {
    if (!onChange) return
    const key = [...ids].sort().join(',')
    if (key === lastKeyRef.current) return
    lastKeyRef.current = key
    onChange(ids)
  })
}
