import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix: Prevent workspace root misdetection from stray package-lock.json files
  // on parent directories (e.g., Desktop root). See build_errors.txt warning.
  turbopack: {
    root: path.resolve(__dirname),
  },

  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://127.0.0.1:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
