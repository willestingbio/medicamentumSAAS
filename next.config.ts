import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Configuración para Server Components y Server Actions
  experimental: {},
};

export default nextConfig;
