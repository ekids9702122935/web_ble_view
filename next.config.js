/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/web_ble_view', //本地測試先註解
  assetPrefix: '/web_ble_view/', //本地測試先註解
  trailingSlash: true,
}

module.exports = nextConfig 