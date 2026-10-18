import path from 'node:path'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname, '../..'),
  transpilePackages: ['@mapcar/contracts'],
  devIndicators: { position: 'bottom-right' },
  experimental: { optimizePackageImports: ['lucide-react'] },
}

export default config
