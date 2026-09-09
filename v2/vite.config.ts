import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname),
  base: '/lab/v2/',
  build: {
    outDir: path.resolve(__dirname, '../dist-v2'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        phase1: path.resolve(__dirname, 'phase1.html'),
      },
    },
  },
});
