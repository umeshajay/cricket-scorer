/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: '/cricket-scorer',
  assetPrefix: '/cricket-scorer/',
};
module.exports = nextConfig;
