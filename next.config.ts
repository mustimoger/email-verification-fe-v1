import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const embedOrigins = process.env.NEXT_PUBLIC_PRICING_EMBED_PARENT_ORIGINS;
    const frameAncestors = embedOrigins && embedOrigins.trim().length > 0 ? embedOrigins : "'none'";
    return [
      {
        source: "/pricing/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${frameAncestors}`,
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
