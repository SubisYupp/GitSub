import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server-side rendering for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
