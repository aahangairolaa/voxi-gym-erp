import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Biometric devices (e.g. ZKTeco "ADMS"/push mode) call fixed URLs like /iclock/cdata.
  // We keep those handlers under /api/biometric/iclock and map the device URLs to them.
  async rewrites() {
    return [
      { source: "/iclock/:path*", destination: "/api/biometric/iclock/:path*" },
    ];
  },
};

export default nextConfig;
