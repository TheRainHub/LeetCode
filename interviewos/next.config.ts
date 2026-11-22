import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lesson markdown is parsed at seed time only; nothing here needs server externals.
  serverExternalPackages: ["postgres"],
  agentRules: false,
  experimental: {
    // Import only the Radix primitives in use; the barrel otherwise pulls every primitive into the
    // server bundle, which matters for the 3 MiB Worker limit on Cloudflare's free plan.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
