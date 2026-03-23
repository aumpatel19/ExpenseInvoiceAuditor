import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix: Prevent workspace root misdetection from stray package-lock.json files
  // on parent directories (e.g., Desktop root). See build_errors.txt warning.
  turbopack: {
    root: path.resolve(__dirname),
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8002/api/:path*",
      },
    ];
  },
};

export default nextConfig;
