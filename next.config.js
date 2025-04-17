/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing configuration...
  
  experimental: {
    turbo: {
      resolveAlias: {
        canvas: './empty-module.ts',
      },
    },
  },
};

module.exports = nextConfig; 