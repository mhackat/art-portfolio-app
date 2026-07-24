/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Add your image storage host(s) here, e.g. Cloudflare R2 or S3
      // { protocol: 'https', hostname: '*.r2.dev' },
    ],
  },
};

module.exports = nextConfig;
