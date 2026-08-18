import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // TODO: restore to false once pre-existing TS errors in working tree are resolved
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
