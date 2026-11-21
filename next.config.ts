import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Biometric devices (e.g. ZKTeco "ADMS"/push mode) call fixed URLs like /iclock/cdata.
  // We keep those handlers under /api/biometric/iclock and map the device URLs to them.
  // Basic security headers for every page
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/iclock/:path*", destination: "/api/biometric/iclock/:path*" },
    ];
  },
};

export default nextConfig;
