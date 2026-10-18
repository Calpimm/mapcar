import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mapcar/contracts'],
  devIndicators: { position: 'bottom-right' },
  experimental: { optimizePackageImports: ['lucide-react'] },
}

export default config
