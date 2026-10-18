import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: { position: 'bottom-left' },
  transpilePackages: ['@mapcar/contracts', '@mapcar/sim'],
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
}

export default config
