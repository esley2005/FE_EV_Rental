import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Fix for Turbopack internal helpers 404 error
  experimental: {
    turbo: {
      resolveAlias: {
        // Ensure internal helpers are resolved correctly
      },
    },
  },
};

export default nextConfig;
