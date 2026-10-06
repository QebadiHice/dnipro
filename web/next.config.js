/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['raw.githubusercontent.com', 'assets.coingecko.com'],
  },
};

module.exports = nextConfig;