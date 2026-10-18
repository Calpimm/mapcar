// maplibre-gl v6 worker'ını import.meta.url'e göre bulur; bundle sonrası bu yol kırılır.
// Worker'ı public/ altına kopyalayıp setWorkerUrl ile gösteriyoruz.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const pkgPath = require.resolve('maplibre-gl/package.json')
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8'))
const outDir = path.resolve(import.meta.dirname, '../public/maplibre')
mkdirSync(outDir, { recursive: true })
copyFileSync(
  path.join(path.dirname(pkgPath), 'dist/maplibre-gl-worker.mjs'),
  path.join(outDir, `worker-${version}.mjs`),
)
console.log(`maplibre worker ${version} kopyalandı`)
