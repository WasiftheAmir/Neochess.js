import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['engine/**/*.{js,ts}'],
      exclude: ['engine/pgn.js'],
    },
  },
})
