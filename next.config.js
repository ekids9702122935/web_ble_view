/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/web_ble_view',
  assetPrefix: '/web_ble_view/',
  trailingSlash: true,
}

module.exports = nextConfig 