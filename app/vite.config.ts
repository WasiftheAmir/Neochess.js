import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve ui/ assets (backgrounds, lib/stockfish.js) from the parent folder
  publicDir: '../ui',
  build: {
    outDir: '../ui/dist-react',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Let GameScreen import the compiled chess.js ESM bundle
      '../../../dist/esm/chess.js': path.resolve(__dirname, '../dist/esm/chess.js'),
    },
  },
});
