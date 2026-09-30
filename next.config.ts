import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    proxyClientMaxBodySize: "50mb",
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ["lucide-react", "radix-ui"],
    serverActions: {
      bodySizeLimit: "80mb",
    },
  },
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "nazarov.loca.lt",
    "nazarov.tunn3l.sh",
    "nazarov.uz",
    "www.nazarov.uz",
    "*.lhr.life",
    "*.trycloudflare.com",
    "*.tunn3l.sh",
    "*.loca.lt",
    "*.localhost.run",
    "*.serveo.net",
    "*.pinggy.link",
  ],
  images: {
    formats: ["image/webp", "image/avif"],
  },
  async headers() {
    return [
      {
        source: "/nazarov-bg.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-bg-wash.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-mark.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-bg.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-bg.mp4",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-bg.webm",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-portrait.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/nazarov-portrait-sm.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/stickers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
