import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2pqfot7du0xby.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "vkode-media-prod.s3.eu-west-3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
