import path from 'node:path'
import { loadEnvConfig } from '@next/env'
import type { NextConfig } from 'next'

// Monorepo kökündeki .env dosyasını kullan
loadEnvConfig(path.resolve(import.meta.dirname, '../..'))

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
  devIndicators: { position: 'bottom-left' },
  transpilePackages: ['@mapcar/contracts', '@mapcar/sim'],
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
}

export default config
