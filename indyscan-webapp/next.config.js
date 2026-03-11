/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['indyscan-api-client', 'indyscan-txtype'],
  // Keep Pages Router; custom server handles /home/:network etc.
}

module.exports = nextConfig
