const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:3939'],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = withNextIntl(nextConfig)
