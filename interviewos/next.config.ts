import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lesson markdown is parsed at seed time only; nothing here needs server externals.
  serverExternalPackages: ["postgres"],
  agentRules: false,
};

export default nextConfig;
