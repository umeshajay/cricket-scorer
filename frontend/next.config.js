/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Adjust if deploying to GitHub Pages under a sub-path
  // basePath: '/cricket-scorer',
  // assetPrefix: '/cricket-scorer/',
};
module.exports = nextConfig;
