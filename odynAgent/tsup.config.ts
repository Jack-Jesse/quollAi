import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  async onSuccess() {
    // Copy logo.txt to dist so the built code can find it
    const fs = await import('fs');
    const path = await import('path');
    const src = path.join(__dirname, 'src/lib/logo.txt');
    const dst = path.join(__dirname, 'dist/logo.txt');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      console.log('Copied logo.txt to dist/');
    }
  },
});
