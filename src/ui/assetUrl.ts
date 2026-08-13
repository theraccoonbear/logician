/** Resolves a public/ asset path against the app's base URL — "/" in dev, "/logician/" in
 *  the GitHub Pages build (see vite.config.ts) — so image references keep working under a
 *  subpath instead of hardcoding a domain-root "/". */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
