import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        net: false,
        crypto: false,
        tls: false,
        stream: false,
        perf_hooks: false,
        fs: false,
        os: false,
      },
    };

    return config;
  },
};

export default nextConfig;
