import type { NextConfig } from "next";
import { buildFrameAncestorsDirective, getEmbedParentOrigins } from "./app/lib/embed-config";

const nextConfig: NextConfig = {
  async headers() {
    const { origins } = getEmbedParentOrigins();
    const frameAncestors = buildFrameAncestorsDirective(origins);
    return [
      {
        source: "/pricing/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: frameAncestors,
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8001",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
