import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["anki-apkg-export", "sql.js"],
  async rewrites() {
    return [
      {
        source: "/mcp",
        destination: "http://localhost:3001/mcp",
      },
      {
        source: "/mcp/:path*",
        destination: "http://localhost:3001/mcp/:path*",
      },
    ];
  },
};

export default nextConfig;
