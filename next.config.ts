import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    output: 'standalone',
    publicRuntimeConfig: {
        NODE_ENV: process.env.NODE_ENV,
    },
};

export default nextConfig;
