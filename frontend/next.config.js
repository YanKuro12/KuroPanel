/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/:path*',
      },
      {
        source: '/ws',
        destination: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws',
      },
    ]
  },
}

module.exports = nextConfig