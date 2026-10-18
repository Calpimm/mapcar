import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // Workspace paketleri TS kaynağı olarak dağıtılıyor; API paketine gömülür.
  noExternal: [/^@mapcar\//],
})
