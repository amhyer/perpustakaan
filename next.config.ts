import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-sc.cloudapp.web.id',
        port: '',
        pathname: '/content/**',
      },
    ],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "21.0.2.100"],
};

export default nextConfig;
