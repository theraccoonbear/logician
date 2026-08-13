import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project sites serve from /<repo-name>/, not the domain root. Only applied
  // to the production build, not `vite dev` — every image reference in the app goes through
  // assetUrl() (src/ui/assetUrl.ts), which reads this from import.meta.env.BASE_URL, so it
  // resolves correctly in both places without hardcoding a path here or there.
  base: command === 'build' ? '/logician/' : '/',
  test: {
    environment: 'node',
    globals: true,
  },
}))
