import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

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

export default withSentryConfig(nextConfig, {
  // Suppress build output unless running in CI
  silent: !process.env.CI,
  // Source map upload — set SENTRY_ORG + SENTRY_PROJECT env vars to enable
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Don't fail the build if Sentry upload errors (e.g. no org/project set)
  errorHandler(err, invokeErr, compilation) {
    compilation.warnings.push(new Error(`[Sentry] ${err.message}`));
  },
});
